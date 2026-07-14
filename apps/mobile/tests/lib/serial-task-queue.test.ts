import { SerialTaskQueue } from "@/lib/serial-task-queue";

describe("SerialTaskQueue", () => {
  it("runs one task at a time and continues after a rejected task", async () => {
    const queue = new SerialTaskQueue();
    const events: string[] = [];
    let releaseFirst: () => void = () => undefined;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const first = queue.run(async () => {
      events.push("first started");
      await firstGate;
      events.push("first finished");
      return 1;
    });
    const rejected = queue.run(async () => {
      events.push("second started");
      throw new Error("unavailable");
    });
    const third = queue.run(async () => {
      events.push("third started");
      return 3;
    });

    await Promise.resolve();
    expect(events).toEqual(["first started"]);

    releaseFirst();
    await expect(first).resolves.toBe(1);
    await expect(rejected).rejects.toThrow("unavailable");
    await expect(third).resolves.toBe(3);
    expect(events).toEqual(["first started", "first finished", "second started", "third started"]);
  });
});
