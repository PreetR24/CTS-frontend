CareSchedule - Doctor Appointment & Staff Shift 
Management System
1. Introduction
CareSchedule is a web-based platform for outpatient clinics, diagnostic centers, and 
multi-specialty hospitals to manage doctor appointments, clinic calendars, and staff 
shift rosters across locations. It enables front-desk teams to book/reschedule/cancel, 
providers to manage their availability & exceptions, and operations teams to plan shifts, 
rotations, on-call coverage, and leave management, while tracking utilization, no-shows, 
and SLA compliance.
Technology stack: REST API backend (Java Spring Boot or .NET Core), Angular/React 
frontend, relational DB (MySQL/PostgreSQL/SQL Server).
Scope (Phase-1): In-app notifications only; no external EHR/EMR/HIS integration-references
can be stored for future use.
Actors / Users
• Patient / Caregiver – Requests and manages appointments (self-service portal 
optional).
• Front Desk / Scheduler – Creates & manages bookings, check-ins, waitlists.
• Physician / Provider – Sets availability, blocks, reviews agenda, marks outcomes.
• Nurse / Technician – Views clinic schedule, manages room & prep slots.
• Operations / HR – Plans staff rosters, shifts, rotations, leaves, on-call.
• Admin – Configures sites, services, templates, users/roles, reports.
2. Module Overview
2.1 Identity & Access Management – Auth, RBAC, audit logs
2.2 Sites, Providers & Services Master – Sites/rooms, provider profiles, services & 
durations
2.3 Availability, Templates & Exceptions – Repeating templates, ad-hoc blocks, 
public slots
2.4 Appointment Booking & Queue – Book/reschedule/cancel, waitlist, check-in, 
outcomes
2.5 Clinic Calendar & Room Management – Multi-resource calendar 
(provider/room/device)
2.6 Shift Planning & Roster – Shift templates, rotations, on-call coverage
2.7 Leave & Time-Off Management – Requests, approvals, auto-reflow of 
schedules
2.8 Capacity & Utilization Rules – Slot rules, buffers, overbooking & SLA controls
2.9 Notifications & Reminders – Reminders, change alerts, no-show follow-ups
2.10 Analytics & Operational Reports – Utilization, no-show, TAT, staffing coverage
2.11 Billing & References (Optional) – Visit charge references (no payments)
2.12 Admin & Configuration – Global settings, working calendars, holidays
3. Architecture Overview
• Frontend: Angular/React SPA
• Backend: REST microservices (Identity, MasterData, Availability, Booking, Roster, 
Leave, Rules, Reports, Notifications)
• Database: MySQL/PostgreSQL/SQL Server
• Integrations (Phase-1): None. EHR/HIS/Payment/Telephony connectors are 
references only.
• Security: RBAC, least-privilege, TLS, encryption at rest (configurable), immutable 
audit logs
• Scalability: Stateless services, horizontal scaling; scheduled jobs for reminders, 
utilization packs, reflow on leave approval
4. Module-Wise Design
4.1 Identity & Access Management Module
Features:
• Login, logout, password reset, lock/unlock
• Roles & permissions 
(Patient/FrontDesk/Provider/Nurse/Operations/Admin)
• Session/token lifecycle; inactivity timeouts
• Immutable audit logs for read/write actions
• User provisioning, deactivation, role mapping
• Access scopes by site/department
Entities:
User
• UserID
• Name
• Role
• Email
• Phone
• Status
AuditLog
• AuditID
• UserID
• Action
• Resource
• Timestamp
• Metadata
4.2 Sites, Providers & Services Master Module
Features:
• Sites & rooms catalog; room attributes (exam/procedure)
• Provider profile (specialty, services, default duration)
• Services catalog with visit types/durations (new/follow-up/procedure)
• Provider-service mapping with custom durations & buffers
• Department & resource tagging (room/device)
Entities:
Site
• SiteID
• Name
• AddressJSON
• Timezone
• Status
Room
• RoomID
• SiteID
• RoomName
• RoomType (Exam/Procedure/Triage)
• AttributesJSON
• Status
Provider
• ProviderID
• Name
• Specialty
• Credentials
• ContactInfo
• Status
Service
• ServiceID
• Name
• VisitType (New/FollowUp/Procedure)
• DefaultDurationMin
• BufferBeforeMin
• BufferAfterMin
• Status
ProviderService
• PSID
• ProviderID
• ServiceID
• CustomDurationMin
• CustomBufferBeforeMin
• CustomBufferAfterMin
• Status
4.3 Availability, Templates & Exceptions Module
Features:
• Weekly/bi-weekly recurring availability templates
• Ad-hoc blocks (CME/OR/procedure) & overrides
• Publishable public slots (for self-service)
• Blackout periods (site holidays, maintenance)
• Derived slot generation (rolling N days)
Entities:
AvailabilityTemplate
• TemplateID
• ProviderID
• SiteID
• DayOfWeek
• StartTime
• EndTime
• SlotDurationMin
• Status
AvailabilityBlock
• BlockID
• ProviderID
• SiteID
• Date
• StartTime
• EndTime
• Reason
• Status (Active/Cancelled)
Blackout
• BlackoutID
• SiteID
• StartDate
• EndDate
• Reason
• Status
PublishedSlot
• PubSlotID
• ProviderID
• SiteID
• ServiceID
• SlotDate
• StartTime
• EndTime
• Status (Open/Held/Closed)
4.4 Appointment Booking & Queue Module
Features:
• Create/reschedule/cancel; reason codes & policies
• Eligibility checks (provider, service, room; conflicts)
• Overbooking rules & waitlist with priority
• Check-in flow with queue tokens; walk-ins
• Visit outcomes (Completed/NoShow/Cancelled) & notes
• Tele-visit flag (reference)
Entities:
Appointment
• AppointmentID
• PatientID
• ProviderID
• SiteID
• ServiceID
• RoomID
• SlotDate
• StartTime
• EndTime
• BookingChannel (FrontDesk/Portal/CallCenter)
• Status (Booked/CheckedIn/Completed/Cancelled/NoShow)
AppointmentChange
• ChangeID
• AppointmentID
• ChangeType (Reschedule/Cancel/Status)
• OldValuesJSON
• NewValuesJSON
• ChangedBy
• ChangedDate
• Reason
Waitlist
• WaitID
• SiteID
• ProviderID
• ServiceID
• PatientID
• Priority (High/Normal)
• RequestedDate
• Status (Open/Filled/Expired)
CheckIn
• CheckInID
• AppointmentID
• TokenNo
• CheckInTime
• RoomAssigned
• Status (Waiting/InRoom/WithProvider/Done)
Outcome
• OutcomeID
• AppointmentID
• Outcome (Completed/NoShow/Cancelled)
• Notes
• MarkedBy
• MarkedDate
4.5 Clinic Calendar & Room Management Module
Features:
• Multi-resource calendar views (provider/room/device)
• Room assignment, swap, & hold
• Conflict detection and resolution suggestions
• Provider agenda & day list; room occupancy board
• Color-coded statuses & drag-drop (UI)
Entities:
ResourceHold
• HoldID
• ResourceType (Room/Device)
• ResourceID
• SiteID
• StartTime
• EndTime
• Reason
• Status (Held/Released)
CalendarEvent
• EventID
• EntityType (Appointment/Block/Blackout/Hold)
• EntityID
• ProviderID
• SiteID
• RoomID
• StartTime
• EndTime
• Status
4.6 Shift Planning & Roster Module
Features:
• Shift templates (Morning/Evening/Night/On-Call)
• Weekly/monthly roster planning per site/department
• Rotations & rules (max hours/mandatory rest)
• On-call coverage & escalations
• Publish/unpublish rosters & staff acknowledgements
Entities:
ShiftTemplate
• ShiftTemplateID
• Name
• StartTime
• EndTime
• BreakMinutes
• Role (Nurse/FrontDesk/Provider)
• SiteID
• Status
Roster
• RosterID
• SiteID
• Department
• PeriodStart
• PeriodEnd
• PublishedBy
• PublishedDate
• Status (Draft/Published)
RosterAssignment
• AssignmentID
• RosterID
• UserID
• ShiftTemplateID
• Date
• Role
• Status (Assigned/Swapped/Absent)
OnCallCoverage
• OnCallID
• SiteID
• Department
• Date
• StartTime
• EndTime
• PrimaryUserID
• BackupUserID
• Status
4.7 Leave & Time-Off Management Module
Features:
• Leave request with types (Vacation/Sick/CME)
• Approval workflow & notifications
• Auto reflow suggestions (reassign appointments/rooms)
• Leave calendars & staffing impact view
Entities:
LeaveRequest
• LeaveID
• UserID
• LeaveType
• StartDate
• EndDate
• Reason
• SubmittedDate
• Status (Pending/Approved/Rejected/Cancelled)
LeaveImpact
• ImpactID
• LeaveID
• ImpactType (Appointments/Roster/Room)
• ImpactJSON
• ResolvedBy
• ResolvedDate
• Status (Open/Resolved)
4.8 Capacity & Utilization Rules Module
Features:
• Slot & buffer rules (min gaps, staggered starts)
• Max daily appointments per provider/service
• Overbooking thresholds & approvals
• SLA rules (max wait time per service)
• Hard vs soft rule controls
Entities:
CapacityRule
• RuleID
• Scope (Provider/Service/Site)
• MaxApptsPerDay
• MaxConcurrentRooms
• BufferMin
• EffectiveFrom
• EffectiveTo
• Status
SLA
• SLAID
• Scope (Service/Provider/Site)
• Metric (WaitTime/Turnaround)
• TargetValue
• Unit (Minutes)
• Status
4.9 Notifications & Reminders Module
Features:
• Appointment reminders (in-app; SMS/email ref)
• Change notifications (reschedule/cancel)
• Waitlist filled alerts
• Shift/roster publish alerts & acknowledgements
• No-show follow-ups (in-app)
Entities:
Notification
• NotificationID
• UserID
• Message
• Category (Appointment/Change/Waitlist/Roster/Leave)
• Status (Unread/Read/Dismissed)
• CreatedDate
ReminderSchedule
• RemindID
• AppointmentID
• RemindOffsetMin
• Channel (InApp/SMS/Email)
• Status
4.10 Analytics & Operational Reports Module
Features:
• Utilization by provider/room/service
• No-show/cancellation rate, rebooking rate
• Wait time & SLA performance
• Staffing coverage vs demand heatmaps
• Export CSV/PDF; scheduled report packs
Entities:
OpsReport
• ReportID
• Scope (Site/Provider/Room/Service/Period)
• MetricsJSON (Utilization/NoShow/Wait/SLA/Coverage)
• GeneratedDate
4.11 Billing & References (Optional) Module
Features:
• Visit charge references by service/provider/site
• Unbilled appointment listing
• Export charge references to billing system (file ref)
Entities:
ChargeRef
• ChargeRefID
• AppointmentID
• ServiceID
• ProviderID
• Amount
• Currency
• Status (Open/Exported/Cancelled)
4.12 Admin & Configuration Module
Features:
• Global working hours; site holidays
• Booking window rules (min/max days in advance)
• Role & permission matrix
• System parameters, feature flags, schedulers
• Data retention configuration (ref)
Entities:
SystemConfig
• ConfigID
• Key
• Value
• Scope (Global/Site)
• UpdatedBy
• UpdatedDate
Holiday
• HolidayID
• SiteID
• Date
• Description
• Status
5. Deployment Strategy
• Local: Angular/React UI + Spring Boot/.NET Core backend + local RDBMS
• Production:
o Containerized services behind API gateway/WAF; stateless nodes
o Schedulers for reminders, utilization packs, leave reflow
o Observability (central logs/metrics/traces), alerting on job failures & SLA 
breaches
o Backups (daily full + PITR), environment promotion & blue/green (optional)
o Secrets management via vault/KMS; DB encryption at rest (configurable)
6. Database Design
Tables:
• User(UserID, Name, Role, Email, Phone, Status)
• AuditLog(AuditID, UserID, Action, Resource, Timestamp, Metadata)
• Site(SiteID, Name, AddressJSON, Timezone, Status)
• Room(RoomID, SiteID, RoomName, RoomType, AttributesJSON, Status)
• Provider(ProviderID, Name, Specialty, Credentials, ContactInfo, Status)
• Service(ServiceID, Name, VisitType, DefaultDurationMin, BufferBeforeMin, 
BufferAfterMin, Status)
• ProviderService(PSID, ProviderID, ServiceID, CustomDurationMin, 
CustomBufferBeforeMin, CustomBufferAfterMin, Status)
• AvailabilityTemplate(TemplateID, ProviderID, SiteID, DayOfWeek, StartTime, 
EndTime, SlotDurationMin, Status)
• AvailabilityBlock(BlockID, ProviderID, SiteID, Date, StartTime, EndTime, Reason, 
Status)
• Blackout(BlackoutID, SiteID, StartDate, EndDate, Reason, Status)
• PublishedSlot(PubSlotID, ProviderID, SiteID, ServiceID, SlotDate, StartTime, 
EndTime, Status)
• Appointment(AppointmentID, PatientID, ProviderID, SiteID, ServiceID, RoomID, 
SlotDate, StartTime, EndTime, BookingChannel, Status)
• AppointmentChange(ChangeID, AppointmentID, ChangeType, OldValuesJSON, 
NewValuesJSON, ChangedBy, ChangedDate, Reason)
• Waitlist(WaitID, SiteID, ProviderID, ServiceID, PatientID, Priority, RequestedDate, 
Status)
• CheckIn(CheckInID, AppointmentID, TokenNo, CheckInTime, RoomAssigned, 
Status)
• Outcome(OutcomeID, AppointmentID, Outcome, Notes, MarkedBy, MarkedDate)
• ResourceHold(HoldID, ResourceType, ResourceID, SiteID, StartTime, EndTime, 
Reason, Status)
• CalendarEvent(EventID, EntityType, EntityID, ProviderID, SiteID, RoomID, 
StartTime, EndTime, Status)
• ShiftTemplate(ShiftTemplateID, Name, StartTime, EndTime, BreakMinutes, Role, 
SiteID, Status)
• Roster(RosterID, SiteID, Department, PeriodStart, PeriodEnd, PublishedBy, 
PublishedDate, Status)
• RosterAssignment(AssignmentID, RosterID, UserID, ShiftTemplateID, Date, Role, 
Status)
• OnCallCoverage(OnCallID, SiteID, Department, Date, StartTime, EndTime, 
PrimaryUserID, BackupUserID, Status)
• LeaveRequest(LeaveID, UserID, LeaveType, StartDate, EndDate, Reason, 
SubmittedDate, Status)
• LeaveImpact(ImpactID, LeaveID, ImpactType, ImpactJSON, ResolvedBy, 
ResolvedDate, Status)
• CapacityRule(RuleID, Scope, MaxApptsPerDay, MaxConcurrentRooms, 
BufferMin, EffectiveFrom, EffectiveTo, Status)
• SLA(SLAID, Scope, Metric, TargetValue, Unit, Status)
• Notification(NotificationID, UserID, Message, Category, Status, CreatedDate)
• ReminderSchedule(RemindID, AppointmentID, RemindOffsetMin, Channel, 
Status)
• OpsReport(ReportID, Scope, MetricsJSON, GeneratedDate)
• ChargeRef(ChargeRefID, AppointmentID, ServiceID, ProviderID, Amount, 
Currency, Status)
• SystemConfig(ConfigID, Key, Value, Scope, UpdatedBy, UpdatedDate)
• Holiday(HolidayID, SiteID, Date, Description, Status)
7. User Interface Design
• Front Desk Dashboard: Quick booking, search, reschedule/cancel, waitlist, check-in 
with token, queue board
• Provider Agenda: My day list, slot management, blocks, room assignment, 
outcomes
• Clinic Calendar: Multi-resource view (provider/room/device), drag-drop, conflict 
alerts
• Roster & Shifts: Templates, plan/publish roster, staff acknowledgment, swap 
workflows
• Leave Console: Submit/approve, impact map (appointments/roster), reflow 
suggestions
• Rules & Capacity: Configure capacity/SLA, buffers, overbooking controls
• Notifications Center: Reminders, changes, roster publish, leave actions
• Reports: Utilization, no-show, wait time, SLA, coverage heatmaps
• Admin Panel: Sites/rooms, services, provider mapping, holidays, config, users/roles, 
schedulers
8. Non-Functional Requirements
• Performance:
o Booking/reschedule P95 < 1.5s; calendar view P95 < 2s; roster publish P95 < 
3s
o Scale to 50,000 concurrent users across sites
• Security:
o RBAC, TLS, encryption at rest (config), immutable audit logs, session 
hardening
• Scalability:
o Stateless APIs, horizontal scale; partition by site; async jobs for reminders & 
reflow
• Availability:
o 99.9% uptime; graceful degradation for analytics & heavy reports
• Maintainability:
o Modular services, configuration-driven rules/templates, API versioning, 
automated migrations
• Observability:
o Central logs/metrics/traces; KPIs (utilization, no-show, wait time, SLA 
breaches); alerts on job failures/spikes
• Data Integrity:
o Conflict detection, transactional booking, idempotent reschedule/cancel, audit 
trails
9. Assumptions & Constraints
• Phase-1 excludes external EHR/HIS, dialer/SMS/email—in-app notifications only
(placeholders for others)
• Tele-visit & payment integrations are references only; no live gateways
• No room/device auto-discovery; resources are maintained as master data
• Holiday calendars managed manually per site
• Fully i