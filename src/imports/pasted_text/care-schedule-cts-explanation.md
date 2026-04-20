CareScheduleCTS -- Complete Project Explanation
What Is It?
CareScheduleCTS is a Clinical Scheduling and Operations Management System -- a backend REST API built with .NET 10 and SQL Server that manages the entire lifecycle of a healthcare clinic's operations: from setting up clinic locations and doctors, to generating appointment slots, booking patients, checking them in, conducting consultations, and recording outcomes.

Think of it as the brain behind a hospital's front-desk software. 0-cite-0

Real-World Scenario: "Sunrise Multi-Specialty Clinic"
Let me walk you through the entire system using a real-world story.

Sunrise Multi-Specialty Clinic has two branches -- one in Hyderabad and one in Bangalore. They have 10 doctors, 5 nurses, and serve 200+ patients daily. They need software to manage everything from doctor schedules to patient check-ins.

PHASE 1: Setting Up Master Data (The Foundation)
Before anything can happen, the clinic admin sets up the foundational data.

1a. Create Sites (Clinic Locations)
The admin registers both branches as Sites. Each Site has a name, address (stored as JSON), timezone, and status.

POST /api/masterdata/sites
{
  "name": "Sunrise Hyderabad",
  "timezone": "Asia/Kolkata",
  "addressJson": "{\"city\":\"Hyderabad\",\"pin\":\"500001\"}",
  "status": "Active"
}
``` [0-cite-1](#0-cite-1) 

### 1b. Create Rooms Inside Each Site

Each site has physical rooms -- consultation rooms, procedure rooms, etc. Rooms have a `RoomType` and an extensible `AttributesJson` field (e.g., to store equipment info).

POST /api/masterdata/rooms { "siteId": 1, "roomName": "Consultation Room A", "roomType": "Consultation", "attributesJson": "{"hasECG":true}" }


### 1c. Register Providers (Doctors)

Each doctor is a **Provider** with a name, specialty, credentials, and contact info.

POST /api/masterdata/providers { "name": "Dr. Anil Sharma", "specialty": "Cardiology", "credentials": "MBBS, MD", "status": "Active" }


### 1d. Define Services (What the Clinic Offers)

Services like "General Consultation", "ECG Test", "Blood Work" are registered. Each service has a `DefaultDurationMin` (e.g., 30 minutes), `BufferBeforeMin`, and `BufferAfterMin`. [0-cite-4](#0-cite-4) 

### 1e. Map Providers to Services

Not every doctor does every service. A **ProviderService** mapping says "Dr. Anil Sharma can perform General Consultation and ECG Test." This is a many-to-many junction table with its own status.

POST /api/masterdata/providerservices { "providerId": 1, "serviceId": 1, "status": "Active" }


The system enforces a **unique constraint** on `(ProviderId, ServiceId)` so you can't map the same pair twice. [0-cite-5](#0-cite-5) 

### 1f. Holidays & System Configuration

- **Holidays**: Site-specific non-working days (e.g., "Diwali" for Hyderabad branch). Slot generation skips these.
- **SystemConfig**: A key-value store for tunable parameters like `booking.capacity.default.maxPerProviderPerDay` (max 20 patients/day) or `reminder.default.offset.min` (send reminder 24 hours before). [0-cite-6](#0-cite-6) 

---

## PHASE 2: Identity & Access Management (Who Can Do What)

### Users & Roles

Every person in the system is a `User` with one of 6 roles: `Patient`, `FrontDesk`, `Provider`, `Nurse`, `Operations`, `Admin`. [0-cite-7](#0-cite-7) 

### Login Flow

When a user logs in, the `AuthService`:
1. Validates the email and role exist in the database
2. Checks the user is not `Inactive` or `Locked`
3. Logs the event to the `AuditLog` table
4. Returns user details

POST /api/auth/login { "email": "anil@sunrise.com", "role": "Provider" }


### Audit Logging

**Every single mutation** in the system creates an `AuditLog` entry -- who did what, when, and a JSON metadata blob with before/after state. This is a cross-cutting concern injected into every service. [0-cite-9](#0-cite-9) 

---

## PHASE 3: Availability & Slot Generation (The Scheduling Engine)

This is the **heart of the system**. It answers: "When is Dr. Anil available for patients?"

### Step 1: Create Availability Templates (Recurring Weekly Schedule)

The admin defines: "Dr. Anil works at Hyderabad branch every Monday from 09:00 to 17:00, with 15-minute slots."

POST /api/availability/templates { "providerId": 1, "siteId": 1, "dayOfWeek": 1, // Monday "startTime": "09:00", "endTime": "17:00", "slotDurationMin": 15, "status": "Active" }


Before saving, the service runs a **fail-fast validation pipeline**: it checks that the Site is Active, the Provider is Active, times are valid, and duration is positive. [0-cite-10](#0-cite-10) 

### Step 2: Generate Published Slots (Expanding Templates into Bookable Inventory)

An admin triggers slot generation for the next N days:

POST /api/availability/slots/generate { "siteId": 1, "days": 14 }


The `GenerateSlots` algorithm in `AvailabilityService`:
1. Loads all active templates for the site
2. Iterates through each day in the horizon (today + N days)
3. Matches the day-of-week to templates
4. For each matching template, loads the provider's active services
5. For each service, chops the time window into slot intervals (e.g., 09:00-09:15, 09:15-09:30, ...)
6. Checks for **idempotency** -- if a slot already exists for that exact (provider, site, service, date, start, end), it skips it
7. Inserts new `PublishedSlot` records with status `Open`

Result: { "insertedCount": 224, "skippedExistingCount": 0 }


### Step 3: Availability Blocks (One-Off Time Off)

If Dr. Anil has a meeting on Tuesday from 14:00-16:00, the admin creates a **Block**:

POST /api/availability/blocks { "providerId": 1, "siteId": 1, "date": "2026-04-01", "startTime": "14:00", "endTime": "16:00", "reason": "Department meeting" }


The system:
1. Validates no overlapping active blocks exist on the same day
2. Creates the block record
3. **Automatically closes** all `Open` or `Held` published slots that fall within 14:00-16:00 (sets status to `Closed` -- closed slots **never reopen**)
4. Projects a `CalendarEvent` for the block so it shows on the calendar view [0-cite-12](#0-cite-12) 

### Slot Lifecycle

Open --> Held (during booking) --> Closed (booked or blocked) ^ | (Blocks also close slots directly)


---

## PHASE 4: Booking & Clinical Workflow (The Patient Journey)

Now let's follow **patient Priya** through the system.

### Step 1: Search for Open Slots

Priya (or the front-desk staff) searches for available slots:

GET /api/availability/slots?providerId=1&serviceId=1&siteId=1&date=2026-04-01


The system validates that the provider, service, and site are all active, and that the provider actually offers this service. Then returns all `Open` slots. [0-cite-13](#0-cite-13) 

### Step 2: Book an Appointment

Priya picks the 10:00 AM slot:

POST /api/appointments/book { "publishedSlotId": 42, "patientId": 5, "bookingChannel": "FrontDesk" }


The `BookingService.Book()` method does **all of this inside a single database transaction**:

1. **Validates** the slot exists and is `Open`
2. **Checks capacity rules** -- reads `booking.capacity.default.maxPerProviderPerDay` from `SystemConfig`. If Dr. Anil already has 20 patients that day, it throws `CAPACITY_EXCEEDED`
3. **Holds the slot** -- sets `PublishedSlot.Status = "Held"`
4. **Creates the Appointment** record with status `Booked`
5. **Projects a CalendarEvent** for the appointment
6. **Creates a Notification** -- "Your appointment is booked on 2026-04-01 at 10:00"
7. **Schedules a Reminder** -- based on `reminder.default.offset.min` config (default 1440 min = 24 hours before)
8. **Writes an AuditLog** entry
9. **Commits the transaction**

If anything fails at any step, the entire transaction rolls back -- no partial state. [0-cite-14](#0-cite-14) 

### Step 3: Reschedule (If Needed)

If Priya needs to change her appointment:

POST /api/appointments/1/reschedule { "newPublishedSlotId": 55, "reason": "Conflict with work" }


The system:
1. Validates the appointment isn't already `Completed`/`Cancelled`/`NoShow`
2. Holds the new slot
3. Frees the old slot (if it was `Held`, sets it back to `Open`)
4. Updates the appointment's date/time/provider/site
5. Records an `AppointmentChange` with old and new values as JSON
6. Sends a notification to Priya
7. Writes an audit log [0-cite-15](#0-cite-15) 

### Step 4: Cancel (If Needed)

POST /api/appointments/1/cancel { "reason": "Feeling better" }


Sets appointment to `Cancelled`, frees the held slot back to `Open`, records the change, notifies the patient. [0-cite-16](#0-cite-16) 

### Step 5: Waitlist (When No Slots Available)

If all slots are full, Priya can be added to a **Waitlist**. If someone cancels, the freed slot can be offered to waitlisted patients based on priority (`Normal` or higher). [0-cite-17](#0-cite-17) 

### Step 6: Check-In (Patient Arrives at Clinic)

On the day of the appointment, Priya arrives. The front-desk staff checks her in:

POST /api/checkins/appointment/1 { "tokenNo": "T-042" }


The `CheckInService`:
1. Validates the appointment is `Booked`
2. Prevents duplicate check-ins
3. Updates appointment status to `CheckedIn`
4. Creates a `CheckIn` record with status `Waiting` and a token number for queue management [0-cite-18](#0-cite-18) 

### Step 7: Room Assignment & Movement

The front-desk assigns Priya to a room and tracks her movement:

Waiting --> RoomAssigned --> InRoom --> WithProvider


- `AssignRoom(checkInId, roomId)` -- assigns a physical room
- `MoveToRoom(checkInId)` -- patient physically enters the room
- `StartConsultation(checkInId)` -- doctor begins seeing the patient [0-cite-19](#0-cite-19) 

### Step 8: Record Outcome (Visit Complete)

After the consultation, the doctor records the outcome:

POST /api/outcomes/appointment/1 { "outcome": "Completed", "notes": "BP normal. Follow-up in 3 months.", "markedBy": 1 }


The `OutcomeService`:
1. Validates the appointment isn't already finalized
2. Sets appointment status to `Completed`
3. Creates an `Outcome` record with clinical notes
4. Sends a notification to Priya
5. Can trigger billing via `ChargeRef`

If Priya didn't show up, the doctor marks `NoShow` instead. [0-cite-20](#0-cite-20) 

---

## PHASE 5: Staff Operations (Behind the Scenes)

### Roster & Shift Management

The operations team manages staff schedules:
- **ShiftTemplate**: Defines standard shifts (e.g., "Morning Shift: 08:00-14:00, Role: Nurse")
- **Roster**: A container for a site's schedule for a period
- **RosterAssignment**: Links a specific user to a roster + shift for a specific date [0-cite-21](#0-cite-21) 

### Leave Management

When a nurse requests leave:
1. A `LeaveRequest` is created (status: `Pending`)
2. Admin approves/rejects it
3. On approval, the system calculates **LeaveImpact** -- which roster assignments and appointments are affected [0-cite-22](#0-cite-22) 

### On-Call Coverage

For emergencies, the system tracks who is the **primary** and **backup** on-call staff for each site and date. [0-cite-23](#0-cite-23) 

---

## PHASE 6: Supporting Services

| Module | Purpose |
|---|---|
| **Capacity Rules** | Define max appointments per provider/day, per site, etc. |
| **SLAs** | Track performance metrics (e.g., max wait time) |
| **Notifications** | In-app alerts with lifecycle: `Unread` -> `Read` -> `Dismissed` |
| **Reminder Schedules** | Automated reminders before appointments |
| **Billing (ChargeRef)** | Track charges per appointment (currency defaults to INR) |
| **Operational Reports** | JSON-based metrics stored in `OpsReport` for flexible reporting | [0-cite-24](#0-cite-24) 

---

## Architecture & Design Patterns

### Layered Architecture

```mermaid
graph TB
    subgraph "API Layer"
        Controllers["31 Controllers"]
    end
    subgraph "Service Layer"
        Services["Business Logic Services"]
    end
    subgraph "Repository Layer"
        Repos["Repository Interfaces + Implementations"]
    end
    subgraph "Infrastructure Layer"
        DB["CareScheduleContext (EF Core) + UnitOfWork"]
    end
    subgraph "Database"
        SQL["SQL Server (30+ Tables)"]
    end

    Controllers --> Services
    Services --> Repos
    Repos --> DB
    DB --> SQL
``` [0-cite-25](#0-cite-25) 

### Key Patterns Used

| Pattern | Where | Why |
|---|---|---|
| **Repository Pattern** | Every entity has `IXxxRepository` + `XxxRepository` | Decouples business logic from EF Core |
| **Unit of Work** | `IUnitOfWork` injected into services | Ensures multiple repo operations commit atomically |
| **Database Transactions** | `_db.Database.BeginTransaction()` in `BookingService` | Critical operations like booking wrap everything in an explicit transaction |
| **Dependency Injection** | All 60+ services/repos registered in `Program.cs` | Loose coupling, testability |
| **Global Exception Middleware** | `GlobalExceptionMiddleware` | Catches all exceptions, maps them to proper HTTP codes, returns consistent `ApiResponse<T>` |
| **API Response Envelope** | `ApiResponse<T>` | Every response has `Success`, `Data`, `Error`, `Message`, `Timestamp` |
| **Soft Delete** | Status field on every entity | Never hard-delete; set to `Inactive`/`Cancelled` to preserve referential integrity |
| **Audit Trail** | `AuditLog` table + `IAuditLogService` | Every mutation is logged with before/after JSON metadata | [0-cite-26](#0-cite-26) [0-cite-27](#0-cite-27) 

### Database Schema

The system has **30+ tables** managed via EF Core with Fluent API configuration. Key indexes include:
- `idx_appointment_provider_date` -- fast lookup of a doctor's daily schedule
- `idx_appointment_patient` -- fast lookup of a patient's appointments
- `idx_appointment_site_date` -- fast lookup of all appointments at a site on a date
- `idx_publishedslot_provider_date` -- fast slot queries [0-cite-28](#0-cite-28) 

### Project Structure

CareScheduleCTS/ CareSchedule.API/ --> Controllers, Middleware, Program.cs (entry point) CareSchedule.Infrastructure/ --> DbContext, UnitOfWork CareSchedule.Shared/ --> Common enums, exceptions, helpers Models/ --> 32 domain entity classes (map to DB tables) DTOs/ --> Request/Response data transfer objects Repositories/ --> Interface/ and Implementation/ for data access Services/ --> Interface/ and Implementation/ for business logic postman/ --> Postman collection for testing all APIs






---

## End-to-End Flow Summary (Priya's Journey)

```mermaid
graph LR
    A["Admin sets up Site, Rooms, Providers, Services"] --> B["Admin creates Availability Templates"]
    B --> C["System generates Published Slots"]
    C --> D["Priya searches open slots"]
    D --> E["Priya books appointment"]
    E --> F["System sends notification + schedules reminder"]
    F --> G["Priya arrives, front-desk checks her in"]
    G --> H["Room assigned, patient moves to room"]
    H --> I["Doctor starts consultation"]
    I --> J["Doctor records outcome"]
    J --> K["Billing charge created, appointment completed"]
Every single step above writes to the AuditLog, returns a consistent ApiResponse, and is wrapped in proper error handling via the GlobalExceptionMiddleware.

Technology Stack Summary
Component	Technology
Framework	.NET 10.0
Database	SQL Server via EF Core 10
API Style	RESTful JSON APIs
API Docs	Swagger/OpenAPI
Architecture	Layered (Controller -> Service -> Repository -> DbContext)
Transaction Management	EF Core + explicit BeginTransaction()
Error Handling	Global Exception Middleware
Response Format	ApiResponse<T> envelope