import * as core from "@actions/core";

export async function run(): Promise<void> {
  try {
    const filePaths = core.getMultilineInput("files", { required: true });
    const ref = core.getInput("ref", { required: true });
    core.setOutput("commit-sha", "stub-commit");
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message);
  }
}
