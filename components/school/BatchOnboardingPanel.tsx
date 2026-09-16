"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { CLASSES, SCHOOL } from "@/lib/school/schoolCode";
import {
  mockBatchOnboard,
  mockParseRoster,
  mockSendInvitations,
  type GeneratedInvite,
  type RosterRow,
} from "@/lib/school/mockSchoolApi";
import { DataTable, MockNotice, Panel, Td } from "./DashboardUi";

type Stage = "idle" | "parsing" | "review" | "generating" | "generated" | "sent";

/**
 * Bulk-trigger the consumer registration flow, once per roster row.
 *
 * Worth being precise about what this is: it is not a separate onboarding
 * mechanism. Each row goes through the same mockRegisterSession the /register
 * screen calls, and produces the same /resume?t=… link a parent would get on
 * /link. The only difference is that the school's id and the row's section are
 * attached before the link is handed out, so the student lands on the
 * dashboards without anyone typing a school code.
 */
export function BatchOnboardingPanel({
  onToast,
}: {
  onToast: (message: string) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<Stage>("idle");
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<RosterRow[]>([]);
  const [invites, setInvites] = useState<GeneratedInvite[]>([]);
  const [progress, setProgress] = useState(0);

  async function handleFile(file: File | null) {
    setStage("parsing");
    const parsed = await mockParseRoster(file);
    setFileName(parsed.fileName);
    setRows(parsed.rows);
    setStage("review");
  }

  async function handleGenerate() {
    setStage("generating");
    setProgress(0);
    const generated = await mockBatchOnboard(rows, (done) => setProgress(done));
    setInvites(generated);
    setStage("generated");
  }

  async function handleSend() {
    const result = await mockSendInvitations(invites);
    setStage("sent");
    onToast(
      `${result.sent} invitations queued for WhatsApp — nothing was actually sent.`,
    );
  }

  function reset() {
    setStage("idle");
    setRows([]);
    setInvites([]);
    setFileName("");
    setProgress(0);
    if (fileInput.current) fileInput.current.value = "";
  }

  const countsByClass = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.classId] = (acc[row.classId] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <Panel
      title="Batch onboarding"
      subtitle="Generate a test link per student and send them to parents. Each link is the same one the consumer flow produces, pre-tagged with your school and the student's section."
      aside={
        stage !== "idle" && (
          <button
            type="button"
            onClick={reset}
            className="rounded-lg px-2.5 py-1.5 text-note font-medium text-brand-700 hover:bg-brand-50"
          >
            Start over
          </button>
        )
      }
    >
      <MockNotice className="mb-6">
        No file is actually read — pick any file and the same sample roster
        loads. No WhatsApp or SMS message is sent at any point.
      </MockNotice>

      {stage === "idle" && (
        <div className="rounded-xl border border-dashed border-control-line px-6 py-10 text-center">
          <p className="text-body font-medium text-text">
            Upload your class roster
          </p>
          <p className="mx-auto mt-1.5 max-w-sm text-note text-text-secondary">
            Student name, parent name, parent mobile and section. CSV or Excel.
          </p>
          <input
            ref={fileInput}
            type="file"
            className="sr-only"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
          <Button
            className="mt-5"
            onClick={() => fileInput.current?.click()}
          >
            Choose a file
          </Button>
        </div>
      )}

      {stage === "parsing" && (
        <div className="rounded-xl border border-hairline bg-surface-sunk px-6 py-10 text-center">
          <p aria-live="polite" className="text-body text-text-secondary">
            Reading the roster…
          </p>
        </div>
      )}

      {(stage === "review" || stage === "generating") && (
        <>
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <p className="text-body text-text">
              <strong className="font-medium">{rows.length} students</strong>{" "}
              read from{" "}
              <span className="font-mono text-note text-text-secondary">
                {fileName}
              </span>
            </p>
            <p className="text-note text-text-secondary">
              {Object.entries(countsByClass)
                .map(([classId, n]) => `${classId}: ${n}`)
                .join("  ·  ")}
            </p>
          </div>

          <DataTable
            className="mt-4"
            caption="Roster preview"
            headers={["Student", "Parent", "Mobile", "Section"]}
          >
            {rows.slice(0, 6).map((row) => (
              <tr
                key={row.studentName}
                className="border-b border-hairline last:border-0"
              >
                <Td className="font-medium">{row.studentName}</Td>
                <Td className="text-text-secondary">{row.parentName}</Td>
                <Td className="font-mono text-note text-text-secondary">
                  {row.parentMobile}
                </Td>
                <Td>{row.classId}</Td>
              </tr>
            ))}
          </DataTable>
          {rows.length > 6 && (
            <p className="mt-2 text-note text-text-muted">
              and {rows.length - 6} more
            </p>
          )}

          {stage === "generating" ? (
            <div className="mt-6">
              <p aria-live="polite" className="text-note text-text-secondary">
                Registering {progress} of {rows.length}…
              </p>
              <ProgressBar
                className="mt-2"
                value={progress}
                max={rows.length}
                label={`Registering ${progress} of ${rows.length} students`}
              />
            </div>
          ) : (
            <Button variant="accent" className="mt-6" onClick={handleGenerate}>
              Generate {rows.length} test links
            </Button>
          )}
        </>
      )}

      {(stage === "generated" || stage === "sent") && (
        <>
          <p className="text-body text-text">
            <strong className="font-medium">{invites.length} links</strong>{" "}
            generated and tagged to {SCHOOL.name}.
          </p>

          <DataTable
            className="mt-4"
            caption="Generated invitations"
            headers={["Student", "Section", "Class teacher", "Link"]}
          >
            {invites.slice(0, 5).map((invite) => (
              <tr
                key={invite.sessionToken}
                className="border-b border-hairline last:border-0"
              >
                <Td className="font-medium">{invite.row.studentName}</Td>
                <Td>{invite.classId}</Td>
                <Td className="text-text-secondary">
                  {CLASSES.find((c) => c.id === invite.classId)?.teacherName ?? "—"}
                </Td>
                <Td className="max-w-0 truncate font-mono text-note text-text-secondary">
                  {invite.link}
                </Td>
              </tr>
            ))}
          </DataTable>
          {invites.length > 5 && (
            <p className="mt-2 text-note text-text-muted">
              and {invites.length - 5} more
            </p>
          )}

          {stage === "generated" ? (
            <Button variant="accent" className="mt-6" onClick={handleSend}>
              Send invitations on WhatsApp
            </Button>
          ) : (
            <p className="mt-6 rounded-lg border border-hairline bg-brand-50 px-4 py-3 text-body text-brand-800">
              <strong className="font-medium">
                {invites.length} invitations queued.
              </strong>{" "}
              Parents would receive the link and start at the consent screen. In
              this build nothing left the browser.
            </p>
          )}
        </>
      )}
    </Panel>
  );
}
