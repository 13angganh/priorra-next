import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  serverTimestamp,
  Timestamp,
  type DocumentData,
} from "firebase/firestore";
import { getFirestoreDB } from "@/lib/firebase/config";
import { getCurrentUid } from "@/lib/firebase/auth";
import type { Task } from "@/types/task";

/**
 * FirestoreTaskRepository — used exclusively by SyncEngine. The UI
 * and domain layer must never import this module directly; doing so
 * would defeat the point of the repository abstraction (Architecture
 * Proposal section 1.2). Development Phase #26.
 *
 * All documents live under users/{uid}/tasks/{taskId} — this
 * partitioning is what firestore.rules enforces access control
 * against (Master Instruction section 19).
 */
export class FirestoreTaskRepository {
  private async tasksCollection() {
    const uid = await getCurrentUid();
    if (!uid) throw new Error("Not authenticated — cannot access Firestore.");
    const db = getFirestoreDB();
    return collection(db, "users", uid, "tasks");
  }

  /** Pushes a local Task to Firestore, setting serverUpdatedAt via server clock. */
  async push(task: Task): Promise<void> {
    const tasksRef = await this.tasksCollection();
    const docRef = doc(tasksRef, task.id);
    // deletedAt/syncState/localUpdatedAt/syncVersion are local sync
    // bookkeeping — Firestore stores the domain fields plus a
    // server-clock timestamp, not the client's local bookkeeping.
    const { syncState: _syncState, localUpdatedAt: _localUpdatedAt, ...domainFields } = task;
    await setDoc(docRef, {
      ...domainFields,
      serverUpdatedAt: serverTimestamp(),
    });
  }

  async pull(taskId: string): Promise<(Task & { serverUpdatedAt: string }) | null> {
    const tasksRef = await this.tasksCollection();
    const snapshot = await getDoc(doc(tasksRef, taskId));
    if (!snapshot.exists()) return null;
    return fromFirestoreDoc(snapshot.data());
  }

  /** Pulls every task for the current user — used on initial sync / reconnect. */
  async pullAll(): Promise<Array<Task & { serverUpdatedAt: string }>> {
    const tasksRef = await this.tasksCollection();
    const snapshot = await getDocs(tasksRef);
    return snapshot.docs.map((d) => fromFirestoreDoc(d.data()));
  }
}

function fromFirestoreDoc(data: DocumentData): Task & { serverUpdatedAt: string } {
  const serverUpdatedAt = data.serverUpdatedAt as Timestamp | undefined;
  return {
    ...(data as Task),
    serverUpdatedAt: serverUpdatedAt ? serverUpdatedAt.toDate().toISOString() : "",
  };
}
