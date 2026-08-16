const test = require("node:test");
const assert = require("node:assert/strict");

const {
  NovelDirectorCandidateRuntime,
} = require("../dist/services/novel/director/runtime/novelDirectorCandidateRuntime.js");

test("candidate runtime forces explicit candidate commands past completed-step reuse", async () => {
  let capturedStepInput = null;
  const usageCalls = [];
  const runtime = new NovelDirectorCandidateRuntime({
    workflowService: {
      markTaskFailed: async () => undefined,
    },
    candidateStageService: {},
    directorRuntime: {
      initializeRun: async () => undefined,
    },
    runtimeOrchestrator: {
      runStepModule: async (input) => {
        capturedStepInput = input;
        return input.runner();
      },
    },
    scheduleBackgroundRun: () => undefined,
    withWorkflowTaskUsage: async (workflowTaskId, runner) => {
      usageCalls.push(workflowTaskId);
      return runner();
    },
  });

  const result = await runtime.runWithFailureHandling(
    "task-1",
    async () => ({ batch: { id: "batch-2" } }),
    "candidate_refine",
  );

  assert.deepEqual(result, { batch: { id: "batch-2" } });
  assert.equal(capturedStepInput.module.nodeKey, "candidate_refine");
  assert.equal(capturedStepInput.reuseCompletedStep, false);
  assert.deepEqual(usageCalls, ["task-1"]);
});

test("candidate runtime resumes an explicit candidate phase despite a stale approval projection", async () => {
  const generated = [];
  const runtime = new NovelDirectorCandidateRuntime({
    workflowService: {
      markTaskFailed: async () => undefined,
    },
    candidateStageService: {
      generateCandidates: async (input) => {
        generated.push(input);
      },
    },
    directorRuntime: {
      initializeRun: async () => undefined,
    },
    runtimeOrchestrator: {},
    scheduleBackgroundRun: (_taskId, runner) => runner(),
    withWorkflowTaskUsage: async (_workflowTaskId, runner) => runner(),
  });

  const handled = await runtime.continueTask("task-candidate-recovery", {
    novelId: null,
    status: "running",
    checkpointType: null,
    currentItemKey: "approve_gate",
    seedPayload: {
      idea: "A courier discovers a hidden rule-bound city underworld.",
      runMode: "auto_to_ready",
      candidateStage: {
        mode: "generate",
      },
      directorSession: {
        runMode: "auto_to_ready",
        phase: "candidate_selection",
        isBackgroundRunning: true,
        lockedScopes: ["basic"],
        reviewScope: null,
      },
    },
  });

  assert.equal(handled, true);
  assert.equal(generated.length, 1);
  assert.equal(generated[0].workflowTaskId, "task-candidate-recovery");
});
