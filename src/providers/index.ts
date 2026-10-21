import type { OutgoingEmail, WorkspaceProvider } from "./types.ts";
import { googleWorkspaceProvider } from "./google/index.ts";

export * from "./types.ts";

// Register additional providers (e.g. Microsoft 365) here. The UI only talks to the
// active provider through the WorkspaceProvider interface.
export const workspaceProviders: Record<string, WorkspaceProvider> = {
  [googleWorkspaceProvider.id]: googleWorkspaceProvider,
};

export const workspace: WorkspaceProvider = googleWorkspaceProvider;

// Send or draft several messages through the active provider, collecting per-recipient errors.
async function runBatch(
  messages: OutgoingEmail[],
  action: (message: OutgoingEmail) => Promise<unknown>
): Promise<{ success: boolean; count: number; errors: string[] }> {
  const errors: string[] = [];
  let count = 0;
  for (const message of messages) {
    try {
      await action(message);
      count++;
    } catch (err: any) {
      errors.push(`${message.to}: ${err?.message || err}`);
    }
  }
  return { success: errors.length === 0, count, errors };
}

export const sendEmailBatch = (messages: OutgoingEmail[]) =>
  runBatch(messages, (m) => workspace.email.send(m));

export const draftEmailBatch = (messages: OutgoingEmail[]) =>
  runBatch(messages, (m) => workspace.email.createDraft(m));
