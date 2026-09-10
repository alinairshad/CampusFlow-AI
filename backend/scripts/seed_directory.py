"""
Seed script — populate the University Directory with LGU campus entries.

Usage (from backend/ directory):
    python scripts/seed_directory.py

The script is idempotent: entries are matched by (name, university_id).
Existing entries are skipped; new ones are inserted. No duplicates created.
Re-running the script after adding entries to ENTRIES is safe.
"""
import asyncio
import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings

# ---------------------------------------------------------------------------
# Directory entries to seed
# Each dict must satisfy DepartmentOfficeInDB required fields:
#   name, location, working_hours, contact, services, university_id, updated_at
# Optional: category, description
# ---------------------------------------------------------------------------

ENTRIES = [
    {
        "name": "Account Office",
        "location": "1st floor, near ERP Office",
        "category": "Finance",
        "working_hours": "Mon–Fri 9:00 AM–5:00 PM",
        "contact": "accounts@lgu.edu.pk",
        "services": [
            "Fee payment and challan processing",
            "Fee receipts and clearance",
            "Financial record queries",
            "Scholarship disbursement",
        ],
        "description": (
            "Handles all student fee transactions, challan generation, "
            "payment verification, and financial clearance for degree issuance."
        ),
    },
    {
        "name": "Admission Office",
        "location": "Ground floor, near Gate 7",
        "category": "Admissions",
        "working_hours": "Mon–Fri 9:00 AM–5:00 PM",
        "contact": "admissions@lgu.edu.pk",
        "services": [
            "New student admissions and enrolment",
            "Merit list and offer letters",
            "Document verification",
            "Programme transfer requests",
            "Admission-related queries",
        ],
        "description": (
            "Primary point of contact for new and prospective students. "
            "Handles applications, merit processing, enrolment documentation, "
            "and department transfer requests."
        ),
    },
    {
        "name": "Student Affairs Office",
        "location": "1st floor, near ERP Office",
        "category": "Student Services",
        "working_hours": "Mon–Fri 9:00 AM–5:00 PM",
        "contact": "studentaffairs@lgu.edu.pk",
        "services": [
            "Student grievances and complaints",
            "Disciplinary matters",
            "Student society and club registration",
            "Co-curricular activity coordination",
            "Student welfare support",
        ],
        "description": (
            "Supports student life outside the classroom. Manages student "
            "societies, handles grievances, oversees disciplinary procedures, "
            "and coordinates co-curricular activities."
        ),
    },
    {
        "name": "ORIC Office",
        "location": "2nd floor, near Exam Branch",
        "category": "Research",
        "working_hours": "Mon–Fri 9:00 AM–5:00 PM",
        "contact": "oric@lgu.edu.pk",
        "services": [
            "Research project registration and support",
            "Industry linkage and collaboration",
            "Intellectual property and patents",
            "Research funding and grant guidance",
            "Entrepreneurship and innovation support",
        ],
        "description": (
            "The Office of Research, Innovation and Commercialisation (ORIC) "
            "facilitates research activity, industry partnerships, grant "
            "applications, and commercialisation of university innovations."
        ),
    },
    {
        "name": "VC Office",
        "location": "Ground floor, near Girls Ground",
        "category": "Administration",
        "working_hours": "Mon–Fri 9:00 AM–5:00 PM",
        "contact": "vc@lgu.edu.pk",
        "services": [
            "Vice Chancellor office appointments",
            "Escalated student appeals",
            "Official university correspondence",
        ],
        "description": (
            "Office of the Vice Chancellor. For escalated academic or "
            "administrative matters requiring VC-level attention. "
            "Appointments must be scheduled in advance."
        ),
    },
    {
        "name": "IT Office",
        "location": "Basement, near stairs",
        "category": "IT Support",
        "working_hours": "Mon–Fri 9:00 AM–5:00 PM",
        "contact": "it@lgu.edu.pk",
        "services": [
            "ERP portal access and account issues",
            "Campus Wi-Fi and network support",
            "Hardware and software troubleshooting",
            "University email account setup",
            "Computer lab access",
        ],
        "description": (
            "Provides IT support for students and staff. Handles ERP login "
            "issues, network connectivity, lab access, and general hardware "
            "or software problems on campus."
        ),
    },
    {
        "name": "52 Lab",
        "location": "Ground floor, near Fountain Ground",
        "category": "Facilities",
        "working_hours": "Mon–Fri 8:00 AM–6:00 PM",
        "contact": "labs@lgu.edu.pk",
        "services": [
            "Computer lab access for students",
            "Programming and software project work",
            "Supervised lab sessions",
        ],
        "description": (
            "General-purpose computing lab (Lab 52) available for student "
            "coursework, programming assignments, and supervised practical sessions."
        ),
    },
    {
        "name": "Library",
        "location": "In Sports Complex",
        "category": "Academic Resources",
        "working_hours": "Mon–Fri 8:30 AM–6:00 PM, Sat 9:00 AM–2:00 PM",
        "contact": "library@lgu.edu.pk",
        "services": [
            "Book borrowing and returns",
            "Digital library and research database access",
            "Reading and study rooms",
            "Thesis and research material",
            "Library card issuance",
        ],
        "description": (
            "LGU's main library, located in the Sports Complex. Offers "
            "physical and digital resources, quiet study spaces, and access "
            "to academic journals and research databases."
        ),
    },
    {
        "name": "Girls Masjid",
        "location": "1st floor",
        "category": "Campus Facilities",
        "working_hours": "Open daily during prayer times",
        "contact": "",
        "services": [
            "Prayer facility for female students and staff",
            "Prayer area with wudu facilities",
        ],
        "description": (
            "Dedicated prayer facility for female students and staff, "
            "located on the 1st floor of the campus building."
        ),
    },
    {
        "name": "Boys Masjid",
        "location": "Ground floor",
        "category": "Campus Facilities",
        "working_hours": "Open daily during prayer times",
        "contact": "",
        "services": [
            "Prayer facility for male students and staff",
            "Friday Jumu'ah prayers",
        ],
        "description": (
            "Dedicated prayer facility for male students and staff, "
            "located on the ground floor of the campus."
        ),
    },
    {
        "name": "Cafe",
        "location": "Ground floor, near Girls Ground and NB",
        "category": "Campus Facilities",
        "working_hours": "Mon–Sat 8:00 AM–6:00 PM",
        "contact": "",
        "services": [
            "Food and beverages",
            "Student dining",
            "Snacks and refreshments",
        ],
        "description": (
            "Campus cafeteria serving meals, snacks, and beverages. "
            "Located near Girls Ground and the NB building."
        ),
    },
    {
        "name": "Girls Ground",
        "location": "Ground floor, near Cafe",
        "category": "Campus Facilities",
        "working_hours": "Mon–Sat 8:00 AM–6:00 PM",
        "contact": "",
        "services": [
            "Outdoor recreational space for female students",
            "Sports and leisure activities",
            "Co-curricular event space",
        ],
        "description": (
            "Outdoor ground area designated for female students, used for "
            "recreational activities, sports, and co-curricular events."
        ),
    },
]

# ---------------------------------------------------------------------------
# Seed logic
# ---------------------------------------------------------------------------

async def seed() -> None:
    client = AsyncIOMotorClient(settings.MONGODB_URI, serverSelectionTimeoutMS=15000)
    db = client[settings.DATABASE_NAME]

    uid = settings.UNIVERSITY_ID
    now = datetime.now(timezone.utc)

    inserted = 0
    skipped = 0

    try:
        for entry in ENTRIES:
            # Idempotency: skip if an entry with the same name already exists
            # for this university
            existing = await db["departments_offices"].find_one(
                {"name": entry["name"], "university_id": uid}
            )
            if existing:
                print(f"  SKIP (already exists): {entry['name']}")
                skipped += 1
                continue

            doc = {
                "university_id": uid,
                "name": entry["name"],
                "location": entry["location"],
                "working_hours": entry["working_hours"],
                "contact": entry["contact"],
                "services": entry["services"],
                "category": entry.get("category"),
                "description": entry.get("description"),
                "latitude": entry.get("latitude"),
                "longitude": entry.get("longitude"),
                "updated_at": now,
            }
            result = await db["departments_offices"].insert_one(doc)
            print(f"  INSERTED: {entry['name']} (id={result.inserted_id})")
            inserted += 1

    finally:
        client.close()

    print()
    print(f"Done. {inserted} inserted, {skipped} skipped.")
    print(f"University ID: {uid}")


if __name__ == "__main__":
    asyncio.run(seed())
