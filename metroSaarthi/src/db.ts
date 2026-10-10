import type { Complaint, Incident } from "./model"
import { seedComplaints } from "./model"

const DB_NAME = "metrosaarthi-local"
const DB_VERSION = 1

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains("complaints"))
        db.createObjectStore("complaints", { keyPath: "id" })
      if (!db.objectStoreNames.contains("incidents"))
        db.createObjectStore("incidents", { keyPath: "id" })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function complete(tx: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function loadData(): Promise<{
  complaints: Complaint[]
  incidents: Incident[]
}> {
  const db = await openDB()
  const tx = db.transaction(["complaints", "incidents"], "readonly")
  const complaintReq = tx.objectStore("complaints").getAll()
  const incidentReq = tx.objectStore("incidents").getAll()
  await complete(tx)
  if (!complaintReq.result.length) {
    const seeded = seedComplaints()
    await saveAll(seeded)
    return { complaints: seeded, incidents: [] }
  }
  const migrated = (complaintReq.result as Complaint[]).map((complaint) => {
    if (complaint.source) return complaint
    const demoNumber = Number(complaint.id.replace("MS-DEMO-", ""))
    const isPassengerDemo =
      complaint.id.startsWith("MS-DEMO-") && demoNumber <= 5
    return {
      ...complaint,
      source: isPassengerDemo ? "passenger" as const : "operator" as const,
      passengerSession: isPassengerDemo ? "demo-device" : undefined,
    }
  })
  if (
    migrated.some(
      (complaint, index) => complaint !== complaintReq.result[index],
    )
  ) {
    await saveAll(migrated)
  }
  return { complaints: migrated, incidents: incidentReq.result }
}

export async function saveComplaint(complaint: Complaint) {
  const db = await openDB()
  const tx = db.transaction("complaints", "readwrite")
  tx.objectStore("complaints").put(complaint)
  await complete(tx)
}

export async function saveAll(complaints: Complaint[]) {
  const db = await openDB()
  const tx = db.transaction("complaints", "readwrite")
  const store = tx.objectStore("complaints")
  complaints.forEach((item) => store.put(item))
  await complete(tx)
}

export async function saveIncident(incident: Incident) {
  const db = await openDB()
  const tx = db.transaction("incidents", "readwrite")
  tx.objectStore("incidents").put(incident)
  await complete(tx)
}

export async function resetDatabase() {
  const db = await openDB()
  const tx = db.transaction(["complaints", "incidents"], "readwrite")
  tx.objectStore("complaints").clear()
  tx.objectStore("incidents").clear()
  await complete(tx)
  const seeded = seedComplaints()
  await saveAll(seeded)
  return seeded
}
