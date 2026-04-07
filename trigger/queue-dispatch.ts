import { schedules } from "@trigger.dev/sdk";
import { runQueueDispatcher } from "@/lib/queue/dispatcher";

export const queueDispatchTask = schedules.task({
  id: "queue-dispatch",
  cron: "*/1 * * * *",
  run: async () => {
    return runQueueDispatcher();
  },
});
