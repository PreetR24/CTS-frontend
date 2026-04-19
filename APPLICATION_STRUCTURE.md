# CareSchedule Application Structure

## Fixed Issues
- Updated routing to use nested layouts
- All role-based portals now use their respective layouts with sidebars
- Proper component hierarchy established

## Application Structure

### Routes (`/src/app/routes.ts`)
The application uses React Router v7 with nested routes:
- `/` - Login page (portal selection)
- `/admin/*` - Admin portal with 8 sub-pages
- `/provider/*` - Provider portal with 6 sub-pages
- `/frontdesk/*` - Front Desk portal with 6 sub-pages  
- `/staff/*` - Staff portal with 5 sub-pages
- `/patient/*` - Patient portal with 5 sub-pages
- `/operations/*` - Operations portal with 6 sub-pages

### Layout Components (`/src/app/layouts/`)
Each portal has its own layout with:
- Sidebar navigation
- Header with user info
- Content area with `<Outlet />` for child routes

### Page Structure

#### Admin Portal (`/src/app/pages/admin/`)
- Dashboard.tsx
- Sites.tsx
- Providers.tsx
- Services.tsx
- Users.tsx
- Holidays.tsx
- Config.tsx
- Reports.tsx

#### Provider Portal (`/src/app/pages/provider/`)
- Dashboard.tsx
- Schedule.tsx
- Availability.tsx
- Appointments.tsx
- Patients.tsx
- Leave.tsx

#### Front Desk Portal (`/src/app/pages/frontdesk/`)
- Dashboard.tsx
- Booking.tsx
- CheckIn.tsx
- Queue.tsx
- Search.tsx
- Waitlist.tsx

#### Staff Portal (`/src/app/pages/staff/`)
- Dashboard.tsx
- Schedule.tsx
- Patients.tsx
- Rooms.tsx
- Tasks.tsx

#### Patient Portal (`/src/app/pages/patient/`)
- Dashboard.tsx
- Appointments.tsx
- Records.tsx
- Profile.tsx
- Prescriptions.tsx

#### Operations Portal
- Currently uses legacy `/src/app/pages/OperationsDashboard.tsx`
- Can be split into sub-pages later

## Shared Components (`/src/app/components/`)
- Header.tsx - Top navigation bar
- Sidebar.tsx - Left navigation menu
- StatCard.tsx - Dashboard statistics card

## Data (`/src/app/data/`)
- mockData.ts - All mock data for demonstration

## Color Scheme
- Pastel theme with soft colors
- Admin: #c4b5e8 (lavender)
- Provider: #7ba3c0 (blue)
- FrontDesk: #e8c9a9 (beige)
- Staff: #a9d4b8 (mint green)
- Patient: #e8b5d4 (pink)
- Operations: #e8c9a9 (beige)

## Key Features
- Role-based access with 6 different portals
- Interactive charts using Recharts
- Modal dialogs for forms
- Responsive design
- Indian names and context throughout
- No emojis or pictures as requested
