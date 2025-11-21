import { Absurd, type TaskContext, type TaskRegistrationOptions } from "absurd-sdk";

const app = new Absurd({ db: process.env.DATABASE_URL });

export const registerTask = <TParams, TName extends string>(
  name: TName,
  fn: (params: TParams, ctx: TaskContext) => Promise<void>,
  options: Omit<TaskRegistrationOptions, "name"> = {},
) => {
  app.registerTask({ name, ...options }, fn);
  return (params: TParams) => app.spawn(name, params);
};

await app.startWorker();
