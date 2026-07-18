export const sqlExecutionRuntime = {
  busyStartedAt: 0,
  busyTimer: null,
  activeWorker: null,
  activeExecutionReject: null,
  activeOperation: "",
  requestSequence: 0
};

export function getSqlExecutionRuntime() {
  return sqlExecutionRuntime;
}
