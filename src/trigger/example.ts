import { task } from "@trigger.dev/sdk";

export const helloWorldTask = task({
  id: "hello-world",
  run: async (payload: string) => {
    return { message: `Hello ${payload}!` };
  },
});
