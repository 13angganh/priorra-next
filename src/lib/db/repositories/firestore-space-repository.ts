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
import type { Space } from "@/types/space";

/**
 * FirestoreSpaceRepository — mirrors FirestoreTaskRepository's
 * structure. Used exclusively by SyncEngine. Development Phase #36
 * (added alongside the sync engine — Phase #26 only covered Task).
 *
 * All documents live under users/{uid}/spaces/{spaceId}.
 */
export class FirestoreSpaceRepository {
  private async spacesCollection() {
    const uid = await getCurrentUid();
    if (!uid) throw new Error("Not authenticated — cannot access Firestore.");
    const db = getFirestoreDB();
    return collection(db, "users", uid, "spaces");
  }

  async push(space: Space): Promise<void> {
    const spacesRef = await this.spacesCollection();
    const docRef = doc(spacesRef, space.id);
    const { syncState: _syncState, localUpdatedAt: _localUpdatedAt, ...domainFields } = space;
    await setDoc(docRef, {
      ...domainFields,
      serverUpdatedAt: serverTimestamp(),
    });
  }

  async pull(spaceId: string): Promise<(Space & { serverUpdatedAt: string }) | null> {
    const spacesRef = await this.spacesCollection();
    const snapshot = await getDoc(doc(spacesRef, spaceId));
    if (!snapshot.exists()) return null;
    return fromFirestoreDoc(snapshot.data());
  }

  async pullAll(): Promise<Array<Space & { serverUpdatedAt: string }>> {
    const spacesRef = await this.spacesCollection();
    const snapshot = await getDocs(spacesRef);
    return snapshot.docs.map((d) => fromFirestoreDoc(d.data()));
  }
}

function fromFirestoreDoc(data: DocumentData): Space & { serverUpdatedAt: string } {
  const serverUpdatedAt = data.serverUpdatedAt as Timestamp | undefined;
  return {
    ...(data as Space),
    serverUpdatedAt: serverUpdatedAt ? serverUpdatedAt.toDate().toISOString() : "",
  };
}
