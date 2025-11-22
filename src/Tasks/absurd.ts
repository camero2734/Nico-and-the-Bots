import { Absurd, type TaskContext, type TaskRegistrationOptions } from "absurd-sdk";

export const absurd = new Absurd({ db: process.env.DATABASE_URL });

export const registerTask = <TParams, TName extends string>(
  name: TName,
  fn: (params: TParams, ctx: TaskContext) => Promise<void>,
  options: Omit<TaskRegistrationOptions, "name"> = {},
) => {
  absurd.registerTask({ name, ...options }, fn);
  return (params: TParams) => absurd.spawn(name, params);
};

await absurd.startWorker();
