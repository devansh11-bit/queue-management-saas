import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";
import { auth, db } from "../firebase";

const waitMinutesPerPerson = 5;

function makeQueueId(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getQueueName(queueData) {
  return queueData.name || queueData.placeName || "Queue";
}

function getQueueType(queueData) {
  return queueData.type || "Queue";
}

function getResetQueueData(totalWaiting) {
  if (totalWaiting === 0) {
    return {
      currentToken: 0,
      nextToken: 1,
      estimatedWait: 0,
      currentUserId: ""
    };
  }

  return {
    estimatedWait: getEstimatedWait(totalWaiting)
  };
}

async function getActiveUsersCount(queueId) {
  const activeStatuses = ["waiting", "called"];
  const activeUserSnapshots = await Promise.all(
    activeStatuses.map((status) => {
      const activeUsersQuery = query(
        collection(db, "queueUsers"),
        where("queueId", "==", queueId),
        where("status", "==", status)
      );

      return getDocs(activeUsersQuery);
    })
  );

  return activeUserSnapshots.reduce((total, snapshot) => {
    return total + snapshot.size;
  }, 0);
}

async function resetQueueIfEmpty(queueId) {
  const activeUsersCount = await getActiveUsersCount(queueId);

  if (activeUsersCount > 0) {
    return;
  }

  const queueRef = doc(db, "queues", queueId);

  await updateDoc(queueRef, {
    currentToken: 0,
    totalWaiting: 0,
    nextToken: 1,
    estimatedWait: 0,
    currentUserId: "",
    updatedAt: serverTimestamp()
  });
}

async function getUsersForQueue(queueId) {
  const usersQuery = query(
    collection(db, "queueUsers"),
    where("queueId", "==", queueId)
  );
  const snapshot = await getDocs(usersQuery);

  return snapshot.docs.map((userDoc) => ({
    id: userDoc.id,
    ref: userDoc.ref,
    ...userDoc.data()
  })).sort((firstUser, secondUser) => {
    return (firstUser.tokenNumber || 0) - (secondUser.tokenNumber || 0);
  });
}

export function getEstimatedWait(position) {
  const safePosition = Math.max(Number(position) || 0, 0);
  return safePosition * waitMinutesPerPerson;
}

export function listenToQueues(callback, onError) {
  const queuesQuery = query(collection(db, "queues"), orderBy("name", "asc"));

  return onSnapshot(
    queuesQuery,
    (snapshot) => {
      const queues = snapshot.docs.map((queueDoc) => ({
        id: queueDoc.id,
        ...queueDoc.data()
      }));

      callback(queues);
    },
    onError
  );
}

export function listenToQueueUsers(queueId, callback, onError) {
  const usersQuery = query(
    collection(db, "queueUsers"),
    where("queueId", "==", queueId)
  );

  return onSnapshot(
    usersQuery,
    (snapshot) => {
      const users = snapshot.docs.map((userDoc) => ({
        id: userDoc.id,
        ...userDoc.data()
      })).sort((firstUser, secondUser) => {
        return (firstUser.tokenNumber || 0) - (secondUser.tokenNumber || 0);
      });

      callback(users);
    },
    onError
  );
}

export async function createQueue(nameOrQueueData, type = "Queue") {
  const queueData =
    typeof nameOrQueueData === "string"
      ? { name: nameOrQueueData, type }
      : nameOrQueueData;

  const queueName = getQueueName(queueData);
  const queueType = getQueueType(queueData);
  const queueId = queueData.id || makeQueueId(queueName);

  if (!queueId) {
    throw new Error("Please enter a valid queue name.");
  }

  const queueRef = doc(db, "queues", queueId);
  const queueSnapshot = await getDoc(queueRef);

  if (queueSnapshot.exists()) {
    throw new Error("A queue with this name already exists.");
  }

  await setDoc(queueRef, {
    name: queueName,
    placeName: queueName,
    type: queueType,
    currentToken: 0,
    totalWaiting: 0,
    estimatedWait: 0,
    nextToken: 1,
    currentUserId: "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return queueId;
}

export async function createSampleQueue(place) {
  if (!place?.id) {
    return;
  }

  const queueRef = doc(db, "queues", place.id);
  const queueSnapshot = await getDoc(queueRef);

  if (queueSnapshot.exists()) {
    return;
  }

  await setDoc(queueRef, {
    name: place.name,
    placeName: place.name,
    type: place.type || "Queue",
    currentToken: 0,
    totalWaiting: 0,
    estimatedWait: 0,
    nextToken: 1,
    currentUserId: "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function getQueues() {
  const snapshot = await getDocs(query(collection(db, "queues"), orderBy("name", "asc")));

  return snapshot.docs.map((queueDoc) => ({
    id: queueDoc.id,
    ...queueDoc.data()
  }));
}

export async function getQueue(queueId) {
  const queueRef = doc(db, "queues", queueId);
  const snapshot = await getDoc(queueRef);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data()
  };
}

export async function getCurrentToken(queueId) {
  const queue = await getQueue(queueId);

  if (!queue) {
    return 0;
  }

  return queue.currentToken || 0;
}

export async function joinQueue(place, phoneNumber = "") {
  if (!auth.currentUser) {
    throw new Error("Please login before joining a queue.");
  }

  const queueId = place.id;
  const queueRef = doc(db, "queues", queueId);
  const userRef = doc(db, "queueUsers", `${queueId}_${auth.currentUser.uid}`);

  let tokenNumber = 0;

  await runTransaction(db, async (transaction) => {
    const queueSnapshot = await transaction.get(queueRef);
    const userSnapshot = await transaction.get(userRef);

    if (userSnapshot.exists()) {
      const existingUser = userSnapshot.data();

      if (existingUser.status === "waiting" || existingUser.status === "called") {
        tokenNumber = existingUser.tokenNumber;
        return;
      }
    }

    const queueData = queueSnapshot.exists()
      ? queueSnapshot.data()
      : {
          name: place.name,
          placeName: place.name,
          type: place.type || "Queue",
          currentToken: 0,
          totalWaiting: 0,
          estimatedWait: 0,
          nextToken: 1,
          currentUserId: ""
        };

    tokenNumber = queueData.nextToken || 1;
    const totalWaiting = (queueData.totalWaiting || 0) + 1;

    transaction.set(
      queueRef,
      {
        name: getQueueName(queueData),
        placeName: getQueueName(queueData),
        type: getQueueType(queueData),
        currentToken: queueData.currentToken || 0,
        totalWaiting,
        estimatedWait: getEstimatedWait(totalWaiting),
        nextToken: tokenNumber + 1,
        currentUserId: queueData.currentUserId || "",
        updatedAt: serverTimestamp(),
        createdAt: queueData.createdAt || serverTimestamp()
      },
      { merge: true }
    );

    transaction.set(userRef, {
      userId: auth.currentUser.uid,
      userEmail: auth.currentUser.email || "",
      queueId,
      queueName: place.name,
      placeName: place.name,
      phoneNumber,
      tokenNumber,
      joinedAt: serverTimestamp(),
      status: "waiting",
      updatedAt: serverTimestamp()
    });
  });

  return tokenNumber;
}

export async function getQueueUsers(queueId = "") {
  const usersRef = collection(db, "queueUsers");
  const usersQuery = queueId
    ? query(usersRef, where("queueId", "==", queueId))
    : query(usersRef, orderBy("joinedAt", "desc"));
  const snapshot = await getDocs(usersQuery);

  return snapshot.docs.map((userDoc) => ({
    id: userDoc.id,
    ...userDoc.data()
  })).sort((firstUser, secondUser) => {
    return (firstUser.tokenNumber || 0) - (secondUser.tokenNumber || 0);
  });
}

export async function getUserPosition(queueId, tokenNumberOrUserId) {
  if (typeof tokenNumberOrUserId === "number") {
    const currentToken = await getCurrentToken(queueId);
    return Math.max(tokenNumberOrUserId - currentToken, 0);
  }

  const users = await getQueueUsers(queueId);
  const waitingUsers = users.filter((user) => user.status === "waiting");
  const userIndex = waitingUsers.findIndex((user) => {
    return user.userId === tokenNumberOrUserId;
  });

  if (userIndex === -1) {
    return null;
  }

  return userIndex + 1;
}

export async function getPeopleAhead(queueId, tokenNumber) {
  const currentToken = await getCurrentToken(queueId);
  return Math.max(tokenNumber - currentToken - 1, 0);
}

export async function callNextUser(queueId) {
  if (!queueId) {
    throw new Error("queueId is required.");
  }

  const users = await getUsersForQueue(queueId);
  const firstWaitingUser = users.find((user) => user.status === "waiting");

  if (!firstWaitingUser) {
    throw new Error("No waiting users in this queue.");
  }

  const queueRef = doc(db, "queues", queueId);
  const userRef = doc(db, "queueUsers", firstWaitingUser.id);

  await runTransaction(db, async (transaction) => {
    const queueSnapshot = await transaction.get(queueRef);
    const userSnapshot = await transaction.get(userRef);

    if (!queueSnapshot.exists()) {
      throw new Error("Queue not found.");
    }

    if (!userSnapshot.exists() || userSnapshot.data().status !== "waiting") {
      throw new Error("Waiting user not found.");
    }

    const calledUser = userSnapshot.data();
    const remainingWaiting = Math.max(
      users.filter((user) => user.status === "waiting").length - 1,
      0
    );

    transaction.update(userRef, {
      status: "called",
      calledAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    transaction.set(
      queueRef,
      {
        currentUserId: firstWaitingUser.id,
        currentToken: calledUser.tokenNumber,
        totalWaiting: remainingWaiting,
        estimatedWait: getEstimatedWait(remainingWaiting),
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
  });

  return true;
}

export async function completeCurrentUser(queueId) {
  if (!queueId) {
    throw new Error("queueId is required.");
  }

  const queueRef = doc(db, "queues", queueId);
  const users = await getUsersForQueue(queueId);
  const queueSnapshotBeforeTransaction = await getDoc(queueRef);

  if (!queueSnapshotBeforeTransaction.exists()) {
    throw new Error("Queue not found.");
  }

  const queueDataBeforeTransaction = queueSnapshotBeforeTransaction.data();
  const calledUser =
    users.find((user) => {
      return (
        user.id === queueDataBeforeTransaction.currentUserId &&
        user.status === "called"
      );
    }) ||
    users.find((user) => user.status === "called");

  if (!calledUser) {
    throw new Error("No current user to complete.");
  }

  const waitingUsers = users.filter((user) => user.status === "waiting");
  const userRef = doc(db, "queueUsers", calledUser.id);

  await runTransaction(db, async (transaction) => {
    const queueSnapshot = await transaction.get(queueRef);
    const userSnapshot = await transaction.get(userRef);

    if (!queueSnapshot.exists()) {
      throw new Error("Queue not found.");
    }

    if (!userSnapshot.exists() || userSnapshot.data().status !== "called") {
      throw new Error("No current user to complete.");
    }

    transaction.update(userRef, {
      status: "completed",
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    transaction.set(
      queueRef,
      waitingUsers.length === 0
        ? {
            currentToken: 0,
            totalWaiting: 0,
            nextToken: 1,
            estimatedWait: 0,
            currentUserId: "",
            updatedAt: serverTimestamp()
          }
        : {
            currentUserId: "",
            totalWaiting: waitingUsers.length,
            estimatedWait: getEstimatedWait(waitingUsers.length),
            updatedAt: serverTimestamp()
          },
      { merge: true }
    );
  });

  return true;
}

export async function skipUser(userId) {
  if (!userId) {
    throw new Error("userId is required.");
  }

  const userRef = doc(db, "queueUsers", userId);
  let queueId = "";

  await runTransaction(db, async (transaction) => {
    const userSnapshot = await transaction.get(userRef);

    if (!userSnapshot.exists()) {
      throw new Error("User not found.");
    }

    const userData = userSnapshot.data();
    queueId = userData.queueId;
    const queueRef = doc(db, "queues", userData.queueId);
    const queueSnapshot = await transaction.get(queueRef);
    const queueData = queueSnapshot.exists() ? queueSnapshot.data() : {};
    const wasWaiting = userData.status === "waiting";
    const totalWaiting = wasWaiting
      ? Math.max((queueData.totalWaiting || 0) - 1, 0)
      : queueData.totalWaiting || 0;

    transaction.update(userRef, {
      status: "skipped",
      skippedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    transaction.set(
      queueRef,
      {
        currentUserId:
          queueData.currentUserId === userId ? "" : queueData.currentUserId || "",
        totalWaiting,
        ...getResetQueueData(totalWaiting),
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
  });

  await resetQueueIfEmpty(queueId);

  return true;
}

export async function skipNextUser(queueId) {
  const waitingQuery = query(
    collection(db, "queueUsers"),
    where("queueId", "==", queueId),
    where("status", "==", "waiting")
  );
  const waitingSnapshot = await getDocs(waitingQuery);

  if (waitingSnapshot.empty) {
    throw new Error("No waiting users in this queue.");
  }

  const nextUserDoc = waitingSnapshot.docs
    .map((userDoc) => ({ id: userDoc.id, ...userDoc.data() }))
    .sort((firstUser, secondUser) => {
      return (firstUser.tokenNumber || 0) - (secondUser.tokenNumber || 0);
    })[0];

  await skipUser(nextUserDoc.id);
  return true;
}

export async function completeUser(userId) {
  const userRef = doc(db, "queueUsers", userId);

  await runTransaction(db, async (transaction) => {
    const userSnapshot = await transaction.get(userRef);

    if (!userSnapshot.exists()) {
      throw new Error("User not found.");
    }

    const userData = userSnapshot.data();
    const queueRef = doc(db, "queues", userData.queueId);
    const queueSnapshot = await transaction.get(queueRef);
    const queueData = queueSnapshot.exists() ? queueSnapshot.data() : {};

    transaction.update(userRef, {
      status: "completed",
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    transaction.set(
      queueRef,
      {
        currentUserId:
          queueData.currentUserId === userId ? "" : queueData.currentUserId || "",
        totalWaiting: queueData.totalWaiting || 0,
        ...getResetQueueData(queueData.totalWaiting || 0),
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
  });

  const completedUserSnapshot = await getDoc(userRef);

  if (completedUserSnapshot.exists()) {
    await resetQueueIfEmpty(completedUserSnapshot.data().queueId);
  }

  return true;
}

export async function leaveQueue(placeOrUserId) {
  if (!auth.currentUser && typeof placeOrUserId !== "string") {
    throw new Error("Please login before leaving a queue.");
  }

  const userId =
    typeof placeOrUserId === "string"
      ? placeOrUserId
      : `${placeOrUserId.id}_${auth.currentUser.uid}`;

  const userRef = doc(db, "queueUsers", userId);
  let queueId = "";

  await runTransaction(db, async (transaction) => {
    const userSnapshot = await transaction.get(userRef);

    if (!userSnapshot.exists()) {
      return;
    }

    const userData = userSnapshot.data();
    queueId = userData.queueId;
    const queueRef = doc(db, "queues", userData.queueId);
    const queueSnapshot = await transaction.get(queueRef);
    const queueData = queueSnapshot.exists() ? queueSnapshot.data() : {};
    const wasWaiting = userData.status === "waiting";
    const totalWaiting = wasWaiting
      ? Math.max((queueData.totalWaiting || 0) - 1, 0)
      : queueData.totalWaiting || 0;

    transaction.update(userRef, {
      status: "left",
      leftAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    transaction.set(
      queueRef,
      {
        currentUserId:
          queueData.currentUserId === userId ? "" : queueData.currentUserId || "",
        totalWaiting,
        ...getResetQueueData(totalWaiting),
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
  });

  if (queueId) {
    await resetQueueIfEmpty(queueId);
  }

  return true;
}