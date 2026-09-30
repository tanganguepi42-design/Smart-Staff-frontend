import { useCallback, useEffect, useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import {
  ArrowUpRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  DatabaseBackup,
  FileCheck2,
  FileText,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  PencilLine,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  X,
} from 'lucide-react';

type Role = 'Admin' | 'HR' | 'Employee';
type RequestStatus = 'Pending' | 'Approved' | 'Rejected';

type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: Role;
  title?: string | null;
  department?: string | null;
  employeeId?: string | null;
  phone?: string | null;
  avatar?: string | null;
};

type EmployeeBalance = {
  annual: { allowance: number; used: number; remaining: number };
  permission: { allowance: number; used: number; remaining: number };
  approved_requests: number;
};

type EmployeePolicy = {
  company_name: string;
  annual_leave_days: number;
  permission_days: number;
  annual_leave_note: string;
  permission_note: string;
  leave_types: string[];
};

type LeaveCategory = { id: number; name: string; allowance: string | null; eligibility: string | null; active: boolean };
type HrReport = { total_employees: number; employees_on_leave: number; approved_this_month: number; pending_leave: number };

type LeaveRequest = {
  id: number;
  employee: string;
  initials: string;
  department: string;
  type: string;
  dates: string;
  days: number;
  reason?: string | null;
  submitted: string;
  status: RequestStatus;
  color: string;
};

type EmployeeRequestItem = {
  id: number;
  type: string;
  dates: string;
  days: number;
  reason?: string | null;
  status: RequestStatus;
};

type PermissionRequestItem = EmployeeRequestItem & { employee?: string; department?: string };

type NotificationItem = {
  id: string;
  data: { request_type?: string; request_id?: number; employee_name?: string; reason?: string | null; message?: string };
  read_at: string | null;
};

type RequestReport = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
};

type BackupItem = {
  name: string;
  path: string;
  created_at: string;
  size: number;
};

type EmployeeProfile = {
  name: string;
  title: string;
  department: string;
  email: string;
  employeeId: string;
  phone: string;
  avatar?: string;
};

const defaultProfile: EmployeeProfile = {
  name: 'Aline Kouassi',
  title: 'Project Manager',
  department: 'Operations',
  email: 'aline@cremin-cam.com',
  employeeId: 'CR-2048',
  phone: '+225 07 00 00 00 00',
};

const requests: LeaveRequest[] = [
  { id: 1, employee: 'Sophie Williams', initials: 'SW', department: 'Finance', type: 'Annual leave', dates: 'Sep 18 – Sep 22, 2024', days: 5, submitted: '2 hours ago', status: 'Pending', color: 'bg-blue-100 text-blue-700' },
  { id: 2, employee: 'Daniel Thompson', initials: 'DT', department: 'Operations', type: 'Permission', dates: 'Sep 16, 2024', days: 1, submitted: '5 hours ago', status: 'Pending', color: 'bg-amber-100 text-amber-700' },
  { id: 3, employee: 'Michael Chen', initials: 'MC', department: 'Technology', type: 'Sick leave', dates: 'Sep 12 – Sep 13, 2024', days: 2, submitted: 'Yesterday', status: 'Approved', color: 'bg-emerald-100 text-emerald-700' },
  { id: 4, employee: 'Amelia Brown', initials: 'AB', department: 'Human Resources', type: 'Annual leave', dates: 'Sep 10 – Sep 12, 2024', days: 3, submitted: 'Sep 06, 2024', status: 'Approved', color: 'bg-rose-100 text-rose-700' },
  { id: 5, employee: 'Ethan Miller', initials: 'EM', department: 'Communications', type: 'Exceptional leave', dates: 'Sep 06, 2024', days: 1, submitted: 'Sep 04, 2024', status: 'Rejected', color: 'bg-violet-100 text-violet-700' },
];

const employeeRequestsSeed: EmployeeRequestItem[] = [
  { id: 1, type: 'Annual leave', dates: 'Sep 18 – Sep 22, 2024', days: 5, status: 'Pending' },
  { id: 2, type: 'Permission', dates: 'Sep 16, 2024', days: 1, status: 'Approved' },
  { id: 3, type: 'Sick leave', dates: 'Aug 21 – Aug 22, 2024', days: 2, status: 'Approved' },
];

const navItems = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Leave requests', icon: FileCheck2, count: 8 },
  { label: 'Employees', icon: Users },
  { label: 'Leave calendar', icon: CalendarDays },
  { label: 'Reports', icon: FileText },
];

const AUTH_STORAGE_KEY = 'cremin_auth_user';
const TOKEN_STORAGE_KEY = 'cremin_auth_token';
const ROLE_STORAGE_KEY = 'cremin_auth_role';

function storeAuthSession(token: string, user: AuthUser, role: Role) {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  localStorage.setItem(ROLE_STORAGE_KEY, role);
}

function clearAuthSession() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem(ROLE_STORAGE_KEY);
}

function resolveRole(email: string): Role {
  const normalizedEmail = email.toLowerCase();
  if (normalizedEmail.includes('admin')) return 'Admin';
  if (normalizedEmail.includes('hr')) return 'HR';
  return 'Employee';
}

function requestFromApi(item: { id: number; type: string; start_date: string; end_date: string; days: number; reason?: string | null; status: RequestStatus; employee?: { name: string; department?: string | null } }): LeaveRequest {
  return {
    id: item.id,
    employee: item.employee?.name ?? 'Employee',
    initials: (item.employee?.name ?? 'Employee').split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase(),
    department: item.employee?.department ?? 'Operations',
    type: item.type,
    dates: item.start_date === item.end_date ? item.start_date : `${item.start_date} – ${item.end_date}`,
    days: item.days,
    reason: item.reason ?? null,
    submitted: 'Recently',
    status: item.status,
    color: 'bg-[#e6f3f1] text-[#16766d]',
  };
}

function employeeRequestFromApi(item: { id: number; type: string; start_date: string; end_date: string; days: number; reason?: string | null; status: RequestStatus }): EmployeeRequestItem {
  return {
    id: item.id,
    type: item.type,
    dates: item.start_date === item.end_date ? item.start_date : `${item.start_date} – ${item.end_date}`,
    days: item.days,
    reason: item.reason ?? null,
    status: item.status,
  };
}

function permissionRequestFromApi(item: { id: number; permission_date: string; reason?: string | null; status: RequestStatus; employee?: { name: string; department?: string | null } }): PermissionRequestItem {
  return {
    id: item.id,
    type: 'Permission',
    dates: item.permission_date,
    days: 1,
    reason: item.reason ?? null,
    status: item.status,
    employee: item.employee?.name,
    department: item.employee?.department ?? undefined,
  };
}

function App() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authRole, setAuthRole] = useState<Role | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(true);
  const [showExploreScreen, setShowExploreScreen] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [email, setEmail] = useState('employee@cremin-cam.com');
  const [password, setPassword] = useState('Password123!');

  const [activeNav, setActiveNav] = useState('Overview');
  const [showModal, setShowModal] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [filter, setFilter] = useState<RequestStatus | 'All'>('All');
  const [leaveSearch, setLeaveSearch] = useState('');
  const [localRequests, setLocalRequests] = useState(requests);
  const [notice, setNotice] = useState('');
  const [mobileNav, setMobileNav] = useState(false);
  const [, setProfileEditorOpen] = useState(false);
  const [employeeProfile, setEmployeeProfile] = useState<EmployeeProfile>(defaultProfile);
  const [employeeRequests, setEmployeeRequests] = useState<EmployeeRequestItem[]>(employeeRequestsSeed);
  const [hrLeaveRequests, setHrLeaveRequests] = useState<LeaveRequest[]>([]);
  const [hrPermissionRequests, setHrPermissionRequests] = useState<PermissionRequestItem[]>([]);
  const [hrReports, setHrReports] = useState<{ leave: RequestReport; permission: RequestReport } | null>(null);
  const [adminReports, setAdminReports] = useState<{ leave: RequestReport; permission: RequestReport } | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const [hrEmployees, setHrEmployees] = useState<AuthUser[]>([]);
  const [hrCategories, setHrCategories] = useState<LeaveCategory[]>([]);
  const [hrReport, setHrReport] = useState<HrReport | null>(null);
  const [employeeBalance, setEmployeeBalance] = useState<EmployeeBalance | null>(null);
  const [employeePolicy, setEmployeePolicy] = useState<EmployeePolicy | null>(null);
  const [leaveForm, setLeaveForm] = useState({
    type: 'Annual leave',
    startDate: '2026-09-18',
    endDate: '2026-09-22',
    reason: 'Family trip and rest',
  });
  const [permissionForm, setPermissionForm] = useState({
    date: '2026-09-25',
    reason: 'Personal administrative matter',
  });

  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    const savedUser = localStorage.getItem(AUTH_STORAGE_KEY);
    const savedRole = localStorage.getItem(ROLE_STORAGE_KEY) as Role | null;

    if (!savedToken || !savedUser) {
      setAuthLoading(false);
      return;
    }

    const parsedUser = JSON.parse(savedUser) as AuthUser;
    setAuthUser(parsedUser);
    setAuthToken(savedToken);
    setAuthRole(savedRole ?? parsedUser.role ?? resolveRole(parsedUser.email));

    fetch('/api/me', {
      headers: { Accept: 'application/json', Authorization: `Bearer ${savedToken}` },
      credentials: 'include',
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Session expired');
        const data = (await response.json()) as { user: AuthUser };
        setAuthUser(data.user);
        setAuthRole(data.user.role);
        storeAuthSession(savedToken, data.user, data.user.role);
      })
      .catch(() => {
        clearAuthSession();
        setAuthUser(null);
        setAuthToken(null);
        setAuthRole(null);
      })
      .finally(() => setAuthLoading(false));
  }, []);

  useEffect(() => {
    if (!authToken || authToken === 'demo-token') return;

    const headers = { Accept: 'application/json', Authorization: `Bearer ${authToken}` };
    Promise.all([
      fetch('/api/leave-requests', { headers, credentials: 'include' }).then((response) => response.json()),
      fetch('/api/permission-requests', { headers, credentials: 'include' }).then((response) => response.json()),
    ])
      .then(([leaveData, permissionData]) => {
        const leaveItems = leaveData.requests as Array<{ id: number; type: string; start_date: string; end_date: string; days: number; status: RequestStatus; employee?: { name: string; department?: string | null } }>;
        const permissionItems = permissionData.requests as Array<{ id: number; permission_date: string; status: RequestStatus; employee?: { name: string; department?: string | null } }>;
        if (authRole === 'Admin') {
          setLocalRequests(leaveItems.map(requestFromApi));
        } else if (authRole === 'HR') {
          setHrLeaveRequests(leaveItems.map(requestFromApi));
          setHrPermissionRequests(permissionItems.map(permissionRequestFromApi));
        } else {
          setEmployeeRequests([...leaveItems.map(employeeRequestFromApi), ...permissionItems.map(permissionRequestFromApi)]);
        }
      })
      .catch(() => setNotice('Unable to load leave requests.'));

    if (authRole === 'HR') {
      Promise.all([
        fetch('/api/reports/requests', { headers, credentials: 'include' }).then((response) => response.json()),
        fetch('/api/notifications', { headers, credentials: 'include' }).then((response) => response.json()),
        fetch('/api/hr/employees', { headers, credentials: 'include' }).then((response) => response.json()),
        fetch('/api/hr/leave-categories', { headers, credentials: 'include' }).then((response) => response.json()),
        fetch('/api/hr/reports', { headers, credentials: 'include' }).then((response) => response.json()),
      ]).then(([reportData, notificationData, employeeData, categoryData, hrReportData]) => {
        setHrReports(reportData);
        setNotifications(notificationData.notifications);
        setHrEmployees(employeeData.employees ?? []);
        setHrCategories(categoryData.categories ?? []);
        setHrReport(hrReportData);
      });
    }

    if (authRole === 'Employee') {
      Promise.all([
        fetch('/api/notifications', { headers, credentials: 'include' }).then(async (response) => (response.ok ? response.json() : Promise.reject(new Error('Unable to load notifications')))),
        fetch('/api/employee-balance', { headers, credentials: 'include' }).then(async (response) => (response.ok ? response.json() : Promise.reject(new Error('Unable to load balance')))),
        fetch('/api/employee-policy', { headers, credentials: 'include' }).then(async (response) => (response.ok ? response.json() : Promise.reject(new Error('Unable to load policy')))),
      ])
        .then(([notificationData, balanceData, policyData]) => {
          setNotifications(notificationData.notifications);
          setEmployeeBalance(balanceData);
          setEmployeePolicy(policyData);
        })
        .catch(() => setNotice('Unable to load employee information.'));
    }

    if (authRole === 'Admin') {
      Promise.all([
        fetch('/api/reports/requests', { headers, credentials: 'include' }).then(async (response) => {
          if (!response.ok) throw new Error('Unable to load reports');
          return response.json();
        }),
        fetch('/api/notifications', { headers, credentials: 'include' }).then(async (response) => {
          if (!response.ok) throw new Error('Unable to load notifications');
          return response.json();
        }),
      ])
        .then(([reportData, notificationData]) => {
          setAdminReports(reportData);
          setNotifications(notificationData.notifications);
        })
        .catch(() => setNotice('Unable to load reports.'));
    }

  }, [authRole, authToken]);

  useEffect(() => {
    if (authUser?.role !== 'Employee') return;
    setEmployeeProfile((current) => ({
      ...current,
      name: authUser.name,
      email: authUser.email,
      title: authUser.title ?? current.title,
      department: authUser.department ?? current.department,
      employeeId: authUser.employeeId ?? current.employeeId,
      phone: authUser.phone ?? current.phone,
    }));
  }, [authUser]);

  const visibleRequests = useMemo(() => {
    const normalizedSearch = leaveSearch.trim().toLowerCase();
    const filtered = localRequests.filter((request) => {
      const matchesStatus = filter === 'All' || request.status === filter;
      const matchesSearch = !normalizedSearch || [request.employee, request.department, request.type, request.dates].some((value) => value.toLowerCase().includes(normalizedSearch));
      return matchesStatus && matchesSearch;
    });
    return showAll ? filtered : filtered.slice(0, 4);
  }, [filter, leaveSearch, localRequests, showAll]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginLoading(true);
    setLoginError('');

    const role = resolveRole(email);
    const validDemoUser = ['admin@cremin-cam.com', 'employee@cremin-cam.com', 'hr@cremin-cam.com'].includes(email) && password === 'Password123!';

    if (!validDemoUser) {
      setLoginError('Email or password is invalid. Use the demo account.');
      setLoginLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = (await response.json()) as { message?: string; user?: AuthUser; token?: string };

      if (!response.ok || !data.user || !data.token) {
        throw new Error(data.message ?? 'Login failed.');
      }

      setAuthUser(data.user);
      setAuthToken(data.token);
      setAuthRole(data.user.role ?? role);
      storeAuthSession(data.token, data.user, data.user.role ?? role);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Login failed.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    if (authToken && authToken !== 'demo-token') {
      try {
        await fetch('/api/logout', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          credentials: 'include',
        });
      } catch {
        // ignore
      }
    }

    clearAuthSession();
    setAuthUser(null);
    setAuthToken(null);
    setAuthRole(null);
    setShowWelcomeScreen(true);
    setShowExploreScreen(false);
    setLoginError('');
  };

  const updateRequest = async (id: number, status: RequestStatus) => {
    if (!authToken) return;

    try {
      const response = await fetch(`/api/leave-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${authToken}` },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Request update failed.');
      const data = (await response.json()) as { request: { id: number; type: string; start_date: string; end_date: string; days: number; status: RequestStatus; employee?: { name: string; department?: string | null } } };
      if (authRole === 'HR') {
        setHrLeaveRequests((current) => current.map((request) => (request.id === id ? requestFromApi(data.request) : request)));
      } else {
        setLocalRequests((current) => current.map((request) => (request.id === id ? requestFromApi(data.request) : request)));
      }
      setNotice(`Request ${status.toLowerCase()} successfully.`);
      window.setTimeout(() => setNotice(''), 2600);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Request update failed.');
    }
  };

  const updatePermissionRequest = async (id: number, status: RequestStatus) => {
    if (!authToken) return;

    try {
      const response = await fetch(`/api/permission-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${authToken}` },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Permission update failed.');
      setHrPermissionRequests((current) => current.map((request) => (request.id === id ? { ...request, status } : request)));
      setNotice(`Permission ${status.toLowerCase()} successfully.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Permission update failed.');
    }
  };

  const submitLeaveRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authToken) return;

    const normalizedLeave = {
      type: leaveForm.type,
      startDate: leaveForm.startDate,
      endDate: leaveForm.endDate,
      reason: leaveForm.type === 'Annual leave' ? '' : leaveForm.reason.trim(),
    };

    try {
      const response = await fetch('/api/leave-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${authToken}` },
        credentials: 'include',
        body: JSON.stringify(normalizedLeave),
      });
      if (!response.ok) throw new Error('Leave request could not be sent.');
      const data = (await response.json()) as { request: { id: number; type: string; start_date: string; end_date: string; days: number; status: RequestStatus } };
      setEmployeeRequests((current) => [employeeRequestFromApi(data.request), ...current]);
      setNotice('Leave request sent successfully.');
      setLeaveForm({ type: 'Annual leave', startDate: '2026-09-18', endDate: '2026-09-22', reason: '' });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Leave request could not be sent.');
    }
  };

  const submitPermissionRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authToken) return;

    try {
      const response = await fetch('/api/permission-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${authToken}` },
        credentials: 'include',
        body: JSON.stringify({ permissionDate: permissionForm.date, reason: permissionForm.reason }),
      });
      if (!response.ok) throw new Error('Permission request could not be sent.');
      const data = (await response.json()) as { request: { id: number; permission_date: string; status: RequestStatus } };
      setEmployeeRequests((current) => [permissionRequestFromApi(data.request), ...current]);
      setNotice('Permission request sent successfully.');
      setPermissionForm({ date: '2026-09-25', reason: 'Personal administrative matter' });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Permission request could not be sent.');
    }
  };

  const openNotification = async (notification: NotificationItem) => {
    setSelectedNotification(notification);
    if (notification.read_at || !authToken) return;

    try {
      await fetch(`/api/notifications/${notification.id}/read`, {
        method: 'PATCH',
        headers: { Accept: 'application/json', Authorization: `Bearer ${authToken}` },
        credentials: 'include',
      });
      setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item));
    } catch {
      setNotice('Notification could not be marked as read.');
    }
  };

  const saveProfile = async (profile = employeeProfile) => {
    if (!authToken) return;

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${authToken}` },
        credentials: 'include',
        body: JSON.stringify({ name: profile.name, title: profile.title, department: profile.department, employeeId: profile.employeeId, phone: profile.phone, avatar: profile.avatar ?? null }),
      });
      if (!response.ok) throw new Error('Profile update failed.');
      const data = (await response.json()) as { user: AuthUser };
      setEmployeeProfile((current) => ({ ...current, name: data.user.name, title: data.user.title ?? '', department: data.user.department ?? '', employeeId: data.user.employeeId ?? current.employeeId, phone: data.user.phone ?? '', avatar: data.user.avatar ?? current.avatar }));
      setAuthUser(data.user);
      storeAuthSession(authToken, data.user, data.user.role);
      setProfileEditorOpen(false);
      setNotice('Profile updated successfully.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Profile update failed.');
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-700">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <p className="text-sm font-medium">Checking current session...</p>
        </div>
      </div>
    );
  }

  if (!authUser || !authToken) {
    if (showWelcomeScreen) {
      return (
        <WelcomeScreen
          onContinue={() => {
            setShowWelcomeScreen(false);
            setShowExploreScreen(false);
          }}
          onExplore={() => {
            setShowWelcomeScreen(false);
            setShowExploreScreen(true);
          }}
        />
      );
    }

    if (showExploreScreen) {
      return (
        <ExploreFeaturesScreen
          onBackToWelcome={() => {
            setShowWelcomeScreen(true);
            setShowExploreScreen(false);
          }}
          onAccessSignin={() => {
            setShowWelcomeScreen(false);
            setShowExploreScreen(false);
          }}
        />
      );
    }

    return (
      <LoginScreen
        email={email}
        password={password}
        role={resolveRole(email)}
        setEmail={setEmail}
        setPassword={setPassword}
        loginError={loginError}
        loginLoading={loginLoading}
        onSubmit={handleLogin}
        onBackToWelcome={() => {
          setShowWelcomeScreen(true);
          setShowExploreScreen(false);
        }}
      />
    );
  }

  if (authRole === 'Employee') {
    return (
      <EmployeeDashboard
        employeeProfile={employeeProfile}
        setEmployeeProfile={setEmployeeProfile}
        employeeRequests={employeeRequests}
        leaveForm={leaveForm}
        setLeaveForm={setLeaveForm}
        permissionForm={permissionForm}
        setPermissionForm={setPermissionForm}
        submitLeaveRequest={submitLeaveRequest}
        submitPermissionRequest={submitPermissionRequest}
        saveProfile={saveProfile}
        notifications={notifications}
        employeeBalance={employeeBalance}
        employeePolicy={employeePolicy}
        notice={notice}
        onLogout={handleLogout}
      />
    );
  }

  if (authRole === 'HR') {
    return (
      <div className="role-hr">
        <HrDashboard
          leaveRequests={hrLeaveRequests}
          permissionRequests={hrPermissionRequests}
          reports={hrReports}
          notifications={notifications}
          selectedNotification={selectedNotification}
          onNotificationOpen={openNotification}
          onNotificationClose={() => setSelectedNotification(null)}
          employees={hrEmployees}
          categories={hrCategories}
          hrReport={hrReport}
          onLeaveStatus={updateRequest}
          onPermissionStatus={updatePermissionRequest}
          onLogout={handleLogout}
        />
      </div>
    );
  }

  return (
    <AdminDashboard
      authToken={authToken}
      requests={localRequests}
      reports={adminReports}
      search={leaveSearch}
      setSearch={setLeaveSearch}
      filter={filter}
      setFilter={setFilter}
      onStatus={updateRequest}
      onLogout={handleLogout}
      notifications={notifications}
      selectedNotification={selectedNotification}
      onNotificationOpen={openNotification}
      onNotificationClose={() => setSelectedNotification(null)}
    />
  );

  return (
    <div className="role-admin min-h-screen bg-[#f6f8fb] text-slate-900">
      <aside className={`admin-sidebar fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col bg-[#102b3f] px-5 py-6 text-white transition-transform duration-300 lg:translate-x-0 ${mobileNav ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-3 px-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#cde8e3] text-[#102b3f]"><ShieldCheck size={23} strokeWidth={2.5} /></div>
          <div><p className="text-[15px] font-bold tracking-tight">CREMIN-CAM</p><p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-300">People operations</p></div>
        </div>
        <div className="my-9 h-px bg-white/10" />
        <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Workspace</p>
        <nav className="mt-3 space-y-1.5">
          {navItems.map(({ label, icon: Icon, count }) => (
            <button key={label} onClick={() => { setActiveNav(label); setMobileNav(false); }} aria-current={activeNav === label ? 'page' : undefined} className={`group flex w-full items-center justify-between rounded-xl px-3 py-3 text-sm font-medium transition-all ${activeNav === label ? 'bg-[#1f485b] text-white shadow-sm' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}>
              <span className="flex items-center gap-3"><Icon size={18} strokeWidth={activeNav === label ? 2.3 : 1.8} />{label}</span>
              {count && <span className={`rounded-md px-2 py-0.5 text-[11px] ${activeNav === label ? 'bg-[#cde8e3] text-[#173d4a]' : 'bg-white/10 text-slate-300'}`}>{count}</span>}
            </button>
          ))}
        </nav>
        <p className="mt-9 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Administration</p>
        <nav className="mt-3 space-y-1.5"><button className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"><Settings size={18} strokeWidth={1.8} />Settings</button></nav>
        <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-xs font-semibold text-white">Need a hand?</p><p className="mt-1.5 text-[11px] leading-5 text-slate-400">Find guides and contact support for your team.</p><button className="mt-3 text-xs font-semibold text-[#cde8e3] hover:text-white">Visit help center <ArrowUpRight className="ml-1 inline" size={13} /></button></div>
        <div className="mt-5 flex items-center gap-3 border-t border-white/10 pt-5"><div className="grid h-9 w-9 place-items-center rounded-full bg-[#d9c6a5] text-xs font-bold text-[#5b4833]">JD</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">James Doe</p><p className="text-[11px] text-slate-400">HR Administrator</p></div><MoreHorizontal size={17} className="text-slate-400" /></div>
      </aside>

      {mobileNav && <button aria-label="Close navigation" onClick={() => setMobileNav(false)} className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" />}
      <main className="min-h-screen lg:ml-[264px]">
        <header className="flex h-[74px] items-center justify-between border-b border-slate-200 bg-white/80 px-5 backdrop-blur-md sm:px-8">
          <div className="flex items-center gap-3"><button onClick={() => setMobileNav(true)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"><Menu size={20} /></button><div className="hidden text-sm text-slate-400 sm:block">Workspace <span className="mx-2 text-slate-300">/</span> <span className="font-medium text-slate-700">{activeNav}</span></div></div>
          <div className="flex items-center gap-3"><button className="relative rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"><Bell size={19} strokeWidth={1.8} /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-rose-500 ring-2 ring-white" /></button><div className="h-7 w-px bg-slate-200" /><div className="flex items-center gap-2"><button onClick={handleLogout} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-100">Logout</button><button className="flex items-center gap-2 rounded-xl p-1.5 pr-2 transition hover:bg-slate-100"><div className="grid h-8 w-8 place-items-center rounded-full bg-[#d9c6a5] text-[11px] font-bold text-[#5b4833]">{authUser?.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div><ChevronDown size={15} className="text-slate-400" /></button></div></div>
        </header>

        {activeNav === 'Leave requests' ? (
          <LeaveRequestsPage requests={localRequests} search={leaveSearch} setSearch={setLeaveSearch} filter={filter} setFilter={setFilter} onStatus={updateRequest} />
        ) : <div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-10">
          <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#25766c]">Monday, September 16, 2024</p><h1 className="text-[28px] font-semibold tracking-[-0.03em] text-[#152d3d] sm:text-[32px]">Good morning, James <span className="text-[#d7ae70]">.</span></h1><p className="mt-2 text-sm text-slate-500">Here’s what’s happening with your team today.</p></div><button onClick={() => setShowModal(true)} className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#16766d] px-4 py-3 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(22,118,109,0.18)] transition hover:-translate-y-0.5 hover:bg-[#12645d]"><Plus size={18} /> New leave request</button></div>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={FileCheck2} label="Total requests" value="248" detail="12%" detailText="vs last month" iconClass="bg-[#e6f3f1] text-[#16766d]" />
            <StatCard icon={Clock3} label="Awaiting review" value="08" detail="3" detailText="need your attention" iconClass="bg-[#fff2dc] text-[#c88828]" />
            <StatCard icon={CheckCircle2} label="Approved this month" value="42" detail="8%" detailText="vs last month" iconClass="bg-[#e8f6eb] text-[#26834b]" />
            <StatCard icon={Users} label="Active employees" value="126" detail="4" detailText="new this month" iconClass="bg-[#edf0f8] text-[#6575a8]" />
          </section>

          <section id="leave-requests-panel" className="mt-6 scroll-mt-24 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_2px_12px_rgba(16,43,63,0.03)]"><div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div><h2 className="text-base font-semibold text-[#152d3d]">Leave requests</h2><p className="mt-1 text-xs text-slate-500">Review and manage recent employee requests.</p></div><div className="flex items-center gap-2"><div className="relative hidden sm:block"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input aria-label="Search requests" placeholder="Search requests" className="h-9 w-40 rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs outline-none transition focus:border-[#81bcb4] focus:bg-white" /></div><select aria-label="Filter requests" value={filter} onChange={(event) => setFilter(event.target.value as RequestStatus | 'All')} className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 outline-none focus:border-[#81bcb4]"><option value="All">All status</option><option value="Pending">Pending</option><option value="Approved">Approved</option><option value="Rejected">Rejected</option></select></div></div><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left"><thead><tr className="border-b border-slate-100 text-[10px] uppercase tracking-[0.13em] text-slate-400"><th className="px-6 py-3 font-semibold">Employee</th><th className="px-4 py-3 font-semibold">Leave type</th><th className="px-4 py-3 font-semibold">Dates</th><th className="px-4 py-3 font-semibold">Submitted</th><th className="px-4 py-3 font-semibold">Status</th><th className="px-4 py-3" /></tr></thead><tbody>{visibleRequests.map((request) => <tr key={request.id} className="border-b border-slate-50 transition hover:bg-slate-50/70"><td className="px-6 py-4"><div className="flex items-center gap-3"><div className={`grid h-9 w-9 place-items-center rounded-full ${request.color}`}><span className="text-[11px] font-semibold">{request.initials}</span></div><div><p className="text-sm font-semibold text-slate-700">{request.employee}</p><p className="text-[11px] text-slate-400">{request.department}</p></div></div></td><td className="px-4 py-4 text-sm text-slate-600">{request.type}</td><td className="px-4 py-4 text-sm text-slate-600">{request.dates}</td><td className="px-4 py-4 text-sm text-slate-500">{request.submitted}</td><td className="px-4 py-4"><StatusPill status={request.status} /></td><td className="px-4 py-4 text-right"><div className="flex justify-end gap-2"><button onClick={() => updateRequest(request.id, 'Approved')} className="rounded-lg bg-emerald-50 px-2 py-1.5 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-100">Approve</button><button onClick={() => updateRequest(request.id, 'Rejected')} className="rounded-lg bg-rose-50 px-2 py-1.5 text-[10px] font-semibold text-rose-700 hover:bg-rose-100">Reject</button></div></td></tr>)}</tbody></table></div>{visibleRequests.length >= 4 && <button onClick={() => setShowAll((value) => !value)} className="block w-full border-t border-slate-100 px-4 py-3 text-center text-xs font-semibold text-[#16766d] transition hover:bg-slate-50">{showAll ? 'Show less' : 'View all requests'}</button>}</div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_2px_12px_rgba(16,43,63,0.03)] sm:p-6"><div className="flex items-start justify-between"><div><h2 className="text-base font-semibold text-[#152d3d]">Leave balance</h2><p className="mt-1 text-xs text-slate-500">Company-wide overview</p></div><button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><MoreHorizontal size={18} /></button></div><div className="mt-7 flex items-center gap-6"><div className="relative grid h-32 w-32 shrink-0 place-items-center rounded-full" style={{ background: 'conic-gradient(#16766d 0 68%, #dcefea 68% 100%)' }}><div className="grid h-[98px] w-[98px] place-items-center rounded-full bg-white"><div className="text-center"><p className="text-2xl font-semibold tracking-tight text-[#152d3d]">68%</p><p className="text-[10px] text-slate-400">utilized</p></div></div></div><div className="space-y-4 text-xs"><BalanceRow color="bg-[#16766d]" label="Annual leave" value="68%" /><BalanceRow color="bg-[#d7ae70]" label="Permission" value="42%" /><BalanceRow color="bg-[#dcefea]" label="Other leave" value="19%" /></div></div><div className="mt-7 rounded-xl bg-[#f5f9f8] p-4"><div className="flex items-center justify-between"><p className="text-xs font-semibold text-slate-700">Average balance</p><p className="text-sm font-semibold text-[#16766d]">12.4 days</p></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#dcefea]"><div className="h-full w-[62%] rounded-full bg-[#16766d]" /></div><p className="mt-2 text-[11px] text-slate-400">Across 126 active employees</p></div><button className="mt-5 w-full rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-600 transition hover:border-[#a8d1cb] hover:bg-[#f5f9f8] hover:text-[#16766d]">View balance report</button></div>
          </section>

          <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_2px_12px_rgba(16,43,63,0.03)] sm:p-6"><div className="flex items-center justify-between"><div><h2 className="text-base font-semibold text-[#152d3d]">Approval activity</h2><p className="mt-1 text-xs text-slate-500">Requests processed in the last 7 days</p></div><span className="rounded-lg bg-[#e6f3f1] px-2.5 py-1.5 text-[11px] font-semibold text-[#16766d]">+18.4%</span></div><div className="mt-6 flex h-28 items-end gap-3 border-b border-slate-100 px-2">{[42, 58, 45, 70, 55, 84, 68].map((height, index) => <div key={index} className="group flex h-full flex-1 flex-col justify-end gap-2"><div className="relative w-full rounded-t-md bg-[#b9ddd7] transition-all group-hover:bg-[#16766d]" style={{ height: `${height}%` }}><span className="absolute -top-5 left-1/2 hidden -translate-x-1/2 text-[10px] font-semibold text-slate-500 group-hover:block">{Math.round(height / 2)}</span></div><span className="text-center text-[10px] text-slate-400">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index]}</span></div>)}</div></div><div className="rounded-2xl border border-slate-200 bg-[#102b3f] p-5 text-white shadow-[0_2px_12px_rgba(16,43,63,0.08)] sm:p-6"><div className="flex items-start justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#b3d9d3]">Team pulse</p><h2 className="mt-2 text-xl font-semibold tracking-tight">Everything in one place.</h2><p className="mt-2 max-w-sm text-xs leading-5 text-slate-300">Keep leave plans clear, approvals moving, and your people supported.</p></div><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#1f485b] text-[#cde8e3]"><CalendarDays size={20} /></div></div><div className="mt-7 flex items-center gap-3"><div className="flex -space-x-2"><div className="grid h-7 w-7 place-items-center rounded-full border-2 border-[#102b3f] bg-[#d9c6a5] text-[9px] font-bold text-[#5b4833]">JD</div><div className="grid h-7 w-7 place-items-center rounded-full border-2 border-[#102b3f] bg-[#cde8e3] text-[9px] font-bold text-[#103a40]">SW</div><div className="grid h-7 w-7 place-items-center rounded-full border-2 border-[#102b3f] bg-[#f5d6b8] text-[9px] font-bold text-[#6a4b25]">MC</div></div><div className="ml-2 text-xs text-slate-300">+18 new entries this week</div></div></div></section>
        </div>}
      </main>

      {notice && <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-[#102b3f] px-4 py-3 text-sm font-medium text-white shadow-xl"><CheckCircle2 size={17} className="text-[#b3d9d3]" />{notice}</div>}
      {showModal && <div className="fixed inset-0 z-50 grid place-items-center bg-[#102b3f]/40 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><h2 className="text-lg font-semibold text-[#152d3d]">New leave request</h2><p className="mt-1 text-xs text-slate-500">Create a request on behalf of an employee.</p></div><button onClick={() => setShowModal(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={18} /></button></div><div className="mt-6 space-y-4"><label className="block text-xs font-semibold text-slate-600">Employee<select className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal text-slate-600 outline-none focus:border-[#81bcb4]"><option>Sophie Williams</option><option>Daniel Thompson</option><option>Michael Chen</option></select></label><label className="block text-xs font-semibold text-slate-600">Leave type<select className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal text-slate-600 outline-none focus:border-[#81bcb4]"><option>Annual leave</option><option>Permission</option><option>Sick leave</option><option>Exceptional leave</option></select></label><div className="grid grid-cols-2 gap-3"><label className="block text-xs font-semibold text-slate-600">Start date<input type="date" className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-xs font-normal text-slate-600 outline-none focus:border-[#81bcb4]" /></label><label className="block text-xs font-semibold text-slate-600">End date<input type="date" className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-xs font-normal text-slate-600 outline-none focus:border-[#81bcb4]" /></label></div></div><div className="mt-7 flex justify-end gap-3"><button onClick={() => setShowModal(false)} className="rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-100">Cancel</button><button onClick={() => { setShowModal(false); setNotice('Leave request created successfully.'); }} className="rounded-xl bg-[#16766d] px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#12645d]">Save request</button></div></div></div>}
    </div>
  );
}

function AdminDashboard({
  authToken,
  requests,
  reports,
  search,
  setSearch,
  filter,
  setFilter,
  onStatus,
  onLogout,
  notifications,
  selectedNotification,
  onNotificationOpen,
  onNotificationClose,
}: {
  authToken: string;
  requests: LeaveRequest[];
  reports: { leave: RequestReport; permission: RequestReport } | null;
  search: string;
  setSearch: (value: string) => void;
  filter: RequestStatus | 'All';
  setFilter: Dispatch<SetStateAction<RequestStatus | 'All'>>;
  onStatus: (id: number, status: RequestStatus) => void;
  onLogout: () => void;
  notifications: NotificationItem[];
  selectedNotification: NotificationItem | null;
  onNotificationOpen: (notification: NotificationItem) => void;
  onNotificationClose: () => void;
}) {
  const [section, setSection] = useState('Overview');
  const [employees, setEmployees] = useState<AuthUser[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [notice, setNotice] = useState('');

  const loadAdminData = useCallback(async () => {
    const apiHeaders = { Accept: 'application/json', Authorization: `Bearer ${authToken}` };
    if (section === 'Employee management') {
      const response = await fetch('/api/employees', { headers: apiHeaders, credentials: 'include' });
      if (response.ok) setEmployees((await response.json()).employees);
    }
    if (section === 'System settings') {
      const response = await fetch('/api/settings', { headers: apiHeaders, credentials: 'include' });
      if (response.ok) setSettings((await response.json()).settings);
    }
    if (section === 'Database backup') {
      const response = await fetch('/api/backups', { headers: apiHeaders, credentials: 'include' });
      if (response.ok) setBackups((await response.json()).backups);
    }
  }, [authToken, section]);

  useEffect(() => {
    loadAdminData().catch(() => setNotice('Unable to load Admin data.'));
  }, [loadAdminData]);

  const createEmployee = async (payload: { name: string; email: string; password: string }) => {
    const response = await fetch('/api/employees', { method: 'POST', headers: { Accept: 'application/json', Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(payload) });
    if (!response.ok) { setNotice('Employee could not be created.'); return; }
    setNotice('Employee created successfully.');
    await loadAdminData();
  };

  const updateEmployee = async (id: number, payload: { name: string; title: string; department: string; phone: string }) => {
    const response = await fetch(`/api/employees/${id}`, { method: 'PATCH', headers: { Accept: 'application/json', Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(payload) });
    if (!response.ok) { setNotice('Employee could not be updated.'); return; }
    setNotice('Employee record updated.');
    await loadAdminData();
  };

  const deleteEmployee = async (id: number) => {
    const response = await fetch(`/api/employees/${id}`, { method: 'DELETE', headers: { Accept: 'application/json', Authorization: `Bearer ${authToken}` }, credentials: 'include' });
    if (!response.ok) { setNotice('Employee could not be deleted.'); return; }
    setNotice('Employee deleted.');
    await loadAdminData();
  };

  const saveSettings = async (nextSettings: Record<string, string>) => {
    const response = await fetch('/api/settings', { method: 'PATCH', headers: { Accept: 'application/json', Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ settings: nextSettings }) });
    if (!response.ok) { setNotice('Settings could not be saved.'); return; }
    setSettings((await response.json()).settings);
    setNotice('System settings saved.');
  };

  const createBackup = async () => {
    const response = await fetch('/api/backup', { method: 'POST', headers: { Accept: 'application/json', Authorization: `Bearer ${authToken}` }, credentials: 'include' });
    if (!response.ok) { setNotice('Backup could not be stored.'); return; }
    setNotice('Database backup stored successfully.');
    await loadAdminData();
  };

  const downloadBackup = async () => {
    const response = await fetch('/api/backup', { headers: { Accept: 'application/json', Authorization: `Bearer ${authToken}` }, credentials: 'include' });
    if (!response.ok) { setNotice('Backup could not be downloaded.'); return; }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cremin-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const navigation = [
    { label: 'Overview', icon: LayoutDashboard },
    { label: 'Leave requests', icon: FileCheck2 },
    { label: 'Employee management', icon: Users },
    { label: 'System settings', icon: SlidersHorizontal },
    { label: 'Database backup', icon: DatabaseBackup },
  ];

  return (
    <div className="role-admin min-h-screen bg-[#f6f8fb] text-slate-900">
      <aside className="admin-sidebar fixed inset-y-0 left-0 z-40 hidden w-[272px] flex-col bg-[#102b3f] px-5 py-6 text-white lg:flex">
        <BrandLogo subtitle="Admin workspace" tone="light" />
        <div className="my-8 h-px bg-white/10" /><p className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Administration</p>
        <nav className="mt-3 space-y-1.5">{navigation.map(({ label, icon: Icon }) => <button key={label} onClick={() => setSection(label)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${section === label ? 'bg-[#1f485b] text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}><Icon size={18} />{label}</button>)}</nav>
        <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-xs font-semibold">Secure administration</p><p className="mt-1.5 text-[11px] leading-5 text-slate-400">Manage workforce data and protect operational records.</p></div>
      </aside>
      <div className="lg:ml-[272px]">
        <header className="flex h-[74px] items-center justify-between border-b border-slate-200 bg-white/90 px-5 sm:px-8"><div className="flex items-center gap-4"><div className="lg:hidden"><BrandLogo compact /></div><div><p className="text-xs text-slate-400">Admin workspace</p><p className="text-sm font-semibold text-[#102b3f]">{section}</p></div></div><div className="flex items-center gap-3"><NotificationBell notifications={notifications} onOpen={onNotificationOpen} /><button onClick={onLogout} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Logout</button></div></header>
        <div className="border-b border-slate-200 bg-white px-5 py-3 lg:hidden"><div className="flex gap-2 overflow-x-auto">{navigation.map(({ label, icon: Icon }) => <button key={label} onClick={() => setSection(label)} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${section === label ? 'bg-[#16766d] text-white' : 'bg-slate-100 text-slate-600'}`}><Icon size={14} />{label}</button>)}</div></div>
        {section === 'Overview' && <AdminOverviewPanel requests={requests} reports={reports} search={search} setSearch={setSearch} filter={filter} setFilter={setFilter} onStatus={onStatus} onLogout={onLogout} />}
        {section === 'Leave requests' && <LeaveRequestsPage requests={requests} search={search} setSearch={setSearch} filter={filter} setFilter={setFilter} onStatus={onStatus} />}
        {section === 'Employee management' && <EmployeeManagementPage employees={employees} onCreate={createEmployee} onUpdate={updateEmployee} onDelete={deleteEmployee} />}
        {section === 'System settings' && <SystemSettingsPage settings={settings} onSave={saveSettings} />}
        {section === 'Database backup' && <DatabaseBackupPage backups={backups} onCreate={createBackup} onDownload={downloadBackup} />}
        {notice && <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-[#102b3f] px-4 py-3 text-sm font-medium text-white shadow-xl">{notice}</div>}
        {selectedNotification && <NotificationDetail notification={selectedNotification} onClose={onNotificationClose} />}
      </div>
    </div>
  );
}

function EmployeeManagementPage({ employees, onCreate, onUpdate, onDelete }: { employees: AuthUser[]; onCreate: (payload: { name: string; email: string; password: string }) => Promise<void>; onUpdate: (id: number, payload: { name: string; title: string; department: string; phone: string }) => Promise<void>; onDelete: (id: number) => Promise<void> }) {
  const [form, setForm] = useState({ name: '', email: '', password: 'Password123!', title: '', department: '', phone: '' });
  const [editingId, setEditingId] = useState<number | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (editingId) await onUpdate(editingId, { name: form.name, title: form.title, department: form.department, phone: form.phone });
    else await onCreate({ name: form.name, email: form.email, password: form.password });
    setEditingId(null);
    setForm({ name: '', email: '', password: 'Password123!', title: '', department: '', phone: '' });
  };

  return <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#25766c]">Admin / people</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#102b3f]">Employee management</h1><p className="mt-2 text-sm text-slate-500">Register employees and maintain their professional records.</p></div><span className="rounded-xl bg-[#e6f3f1] px-3 py-2 text-xs font-semibold text-[#16766d]">{employees.length} employees</span></div><section className="mt-8 grid gap-6 xl:grid-cols-[0.8fr_1.2fr]"><form onSubmit={submit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-base font-semibold text-[#102b3f]">{editingId ? 'Edit employee record' : 'Register employee'}</h2><div className="mt-5 space-y-3"><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Full name" className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" /><input required={!editingId} type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="Professional email" disabled={Boolean(editingId)} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm disabled:bg-slate-100" /><input required={!editingId} type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Temporary password" disabled={Boolean(editingId)} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm disabled:bg-slate-100" /><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Position" className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" /><input value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} placeholder="Department" className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" /><input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="Phone" className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" /></div><div className="mt-5 flex gap-2"><button className="rounded-xl bg-[#16766d] px-4 py-3 text-xs font-semibold text-white">{editingId ? 'Save record' : 'Register employee'}</button>{editingId && <button type="button" onClick={() => { setEditingId(null); setForm({ name: '', email: '', password: 'Password123!', title: '', department: '', phone: '' }); }} className="rounded-xl border border-slate-200 px-4 py-3 text-xs font-semibold text-slate-600">Cancel</button>}</div></form><div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-base font-semibold text-[#102b3f]">Employee records</h2><div className="mt-5 space-y-3">{employees.map((employee) => <div key={employee.id} className="flex flex-col gap-3 rounded-2xl border border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-slate-700">{employee.name}</p><p className="mt-1 text-xs text-slate-500">{employee.email} · {employee.title ?? 'Employee'}</p><p className="mt-1 text-[11px] text-slate-400">{employee.department ?? 'No department'} · {employee.phone ?? 'No phone'}</p></div><div className="flex gap-2"><button onClick={() => { setEditingId(employee.id); setForm({ name: employee.name, email: employee.email, password: 'Password123!', title: employee.title ?? '', department: employee.department ?? '', phone: employee.phone ?? '' }); }} className="rounded-lg bg-slate-100 px-3 py-2 text-[10px] font-semibold text-slate-600">Edit</button><button onClick={() => onDelete(employee.id)} className="rounded-lg bg-rose-50 px-3 py-2 text-[10px] font-semibold text-rose-700">Delete</button></div></div>)}{employees.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-xs text-slate-400">No employee records yet.</p>}</div></div></section></main>;
}

function SystemSettingsPage({ settings, onSave }: { settings: Record<string, string>; onSave: (settings: Record<string, string>) => Promise<void> }) {
  const [form, setForm] = useState({ company_name: settings.company_name ?? 'CREMIN-CAM', annual_leave_days: settings.annual_leave_days ?? '18', permission_days: settings.permission_days ?? '12', notifications_enabled: settings.notifications_enabled ?? 'true' });
  useEffect(() => setForm({ company_name: settings.company_name ?? 'CREMIN-CAM', annual_leave_days: settings.annual_leave_days ?? '18', permission_days: settings.permission_days ?? '12', notifications_enabled: settings.notifications_enabled ?? 'true' }), [settings]);
  return <main className="mx-auto max-w-4xl px-5 py-8 sm:px-8"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#25766c]">Admin / configuration</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#102b3f]">System settings</h1><p className="mt-2 text-sm text-slate-500">Control the HR rules and notification behavior used by the application.</p><form onSubmit={(event) => { event.preventDefault(); void onSave(form); }} className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><div className="grid gap-5 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-600">Company name<input value={form.company_name} onChange={(event) => setForm({ ...form, company_name: event.target.value })} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-normal" /></label><label className="text-xs font-semibold text-slate-600">Annual leave days<input type="number" min="0" value={form.annual_leave_days} onChange={(event) => setForm({ ...form, annual_leave_days: event.target.value })} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-normal" /></label><label className="text-xs font-semibold text-slate-600">Permission days<input type="number" min="0" value={form.permission_days} onChange={(event) => setForm({ ...form, permission_days: event.target.value })} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-normal" /></label><label className="flex items-center gap-3 self-end rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-600"><input type="checkbox" checked={form.notifications_enabled === 'true'} onChange={(event) => setForm({ ...form, notifications_enabled: event.target.checked ? 'true' : 'false' })} />Enable HR notifications</label></div><button className="mt-7 rounded-xl bg-[#16766d] px-4 py-3 text-xs font-semibold text-white">Save system settings</button></form></main>;
}

function DatabaseBackupPage({ backups, onCreate, onDownload }: { backups: BackupItem[]; onCreate: () => Promise<void>; onDownload: () => Promise<void> }) {
  return <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#25766c]">Admin / protection</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#102b3f]">Database backup</h1><p className="mt-2 max-w-2xl text-sm text-slate-500">Create and keep recoverable JSON copies of users, leave requests, permissions and system settings.</p></div><div className="flex gap-2"><button onClick={() => void onCreate()} className="inline-flex items-center gap-2 rounded-xl bg-[#16766d] px-4 py-3 text-xs font-semibold text-white"><DatabaseBackup size={16} />Create backup</button><button onClick={() => void onDownload()} className="rounded-xl border border-slate-200 px-4 py-3 text-xs font-semibold text-slate-600">Download latest</button></div></div><section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-base font-semibold text-[#102b3f]">Stored copies</h2><p className="mt-1 text-xs text-slate-500">Saved on the backend in storage/app/backups.</p></div><span className="rounded-lg bg-[#e6f3f1] px-3 py-2 text-xs font-semibold text-[#16766d]">{backups.length} backups</span></div><div className="mt-5 space-y-3">{backups.map((backup) => <div key={backup.path} className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-slate-700">{backup.name}</p><p className="mt-1 text-xs text-slate-400">{new Date(backup.created_at).toLocaleString()} · {Math.round(backup.size / 1024)} KB</p></div><span className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[10px] font-semibold text-emerald-700">Stored</span></div>)}{backups.length === 0 && <p className="rounded-xl bg-slate-50 p-5 text-xs text-slate-400">No stored backups yet. Create the first copy to protect the database.</p>}</div></section></main>;
}

function AdminOverviewPanel({
  requests,
  reports,
  search,
  setSearch,
  filter,
  setFilter,
  onStatus,
  onLogout,
}: {
  requests: LeaveRequest[];
  reports: { leave: RequestReport; permission: RequestReport } | null;
  search: string;
  setSearch: (value: string) => void;
  filter: RequestStatus | 'All';
  setFilter: Dispatch<SetStateAction<RequestStatus | 'All'>>;
  onStatus: (id: number, status: RequestStatus) => void;
  onLogout: () => void;
}) {
  const pendingRequests = requests.filter((request) => request.status === 'Pending');
  const approvedRequests = requests.filter((request) => request.status === 'Approved');
  const visibleRequests = requests.filter((request) => {
    const query = search.trim().toLowerCase();
    return (filter === 'All' || request.status === filter) && (!query || [request.employee, request.department, request.type, request.dates].some((value) => value.toLowerCase().includes(query)));
  });

  return (
    <div className="min-h-screen bg-[#f6f8fb] text-slate-900">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md"><div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-4 sm:px-8 lg:px-10"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#dfeeea] text-[#0b4b45]"><ShieldCheck size={24} /></div><div><p className="text-sm font-bold uppercase tracking-[0.18em] text-[#102b3f]">CREMIN-CAM</p><p className="text-[11px] text-slate-500">Admin workspace</p></div></div><div className="flex items-center gap-3"><span className="hidden rounded-xl bg-[#e6f3f1] px-3 py-2 text-xs font-semibold text-[#16766d] sm:inline-flex">Connected to Laravel</span><button onClick={onLogout} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Logout</button></div></div></header>

      <main className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-10"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#25766c]">People operations</p><h1 className="text-3xl font-semibold tracking-tight text-[#102b3f]">Admin dashboard</h1><p className="mt-2 text-sm text-slate-500">Monitor leave activity, approvals and workforce request trends.</p></div><div className="text-right"><p className="text-xs text-slate-400">Last synchronized</p><p className="mt-1 text-sm font-semibold text-slate-700">Live database</p></div></div>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard icon={FileCheck2} label="Total leave requests" value={`${reports?.leave.total ?? requests.length}`} detail={`${reports?.leave.pending ?? pendingRequests.length}`} detailText="pending review" iconClass="bg-[#e6f3f1] text-[#16766d]" /><StatCard icon={Clock3} label="Awaiting decision" value={`${pendingRequests.length}`} detail="now" detailText="requires attention" iconClass="bg-[#fff2dc] text-[#c88828]" /><StatCard icon={CheckCircle2} label="Approved leave" value={`${reports?.leave.approved ?? approvedRequests.length}`} detail="live" detailText="approved in database" iconClass="bg-[#e8f6eb] text-[#26834b]" /><StatCard icon={CalendarDays} label="Permission requests" value={`${reports?.permission.total ?? 0}`} detail={`${reports?.permission.pending ?? 0}`} detailText="pending HR review" iconClass="bg-[#edf0f8] text-[#6575a8]" /></section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]"><div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"><div><h2 className="text-lg font-semibold text-[#102b3f]">Leave request queue</h2><p className="mt-1 text-xs text-slate-500">Approve or reject requests stored in Laravel.</p></div><div className="flex gap-2"><div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search leave requests" placeholder="Search" className="h-10 w-36 rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs outline-none focus:border-[#81bcb4] focus:bg-white sm:w-48" /></div><select value={filter} onChange={(event) => setFilter(event.target.value as RequestStatus | 'All')} aria-label="Filter request status" className="h-10 rounded-xl border border-slate-200 bg-white px-2 text-xs font-medium text-slate-600 outline-none"><option value="All">All</option><option value="Pending">Pending</option><option value="Approved">Approved</option><option value="Rejected">Rejected</option></select></div></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead className="bg-slate-50 text-[10px] uppercase tracking-[0.14em] text-slate-400"><tr><th className="px-6 py-4 font-semibold">Employee</th><th className="px-4 py-4 font-semibold">Type</th><th className="px-4 py-4 font-semibold">Period</th><th className="px-4 py-4 font-semibold">Status</th><th className="px-4 py-4 text-right font-semibold">Action</th></tr></thead><tbody>{visibleRequests.map((request) => <tr key={request.id} className="border-t border-slate-100 hover:bg-slate-50/70"><td className="px-6 py-4"><div className="flex items-center gap-3"><div className={`grid h-9 w-9 place-items-center rounded-full ${request.color}`}><span className="text-[11px] font-bold">{request.initials}</span></div><div><p className="text-sm font-semibold text-slate-700">{request.employee}</p><p className="text-[11px] text-slate-400">{request.department}</p></div></div></td><td className="px-4 py-4 text-sm text-slate-600">{request.type}</td><td className="px-4 py-4 text-sm text-slate-600">{request.dates}<span className="block text-[11px] text-slate-400">{request.days} day(s)</span></td><td className="px-4 py-4"><StatusPill status={request.status} /></td><td className="px-4 py-4 text-right">{request.status === 'Pending' ? <div className="flex justify-end gap-2"><button onClick={() => onStatus(request.id, 'Approved')} className="rounded-lg bg-emerald-50 px-2.5 py-2 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-100">Approve</button><button onClick={() => onStatus(request.id, 'Rejected')} className="rounded-lg bg-rose-50 px-2.5 py-2 text-[10px] font-semibold text-rose-700 hover:bg-rose-100">Reject</button></div> : <span className="text-[11px] text-slate-400">Processed</span>}</td></tr>)}</tbody></table></div>{visibleRequests.length === 0 && <div className="p-10 text-center text-sm text-slate-500">No requests match your filters.</div>}<div className="border-t border-slate-100 px-6 py-4 text-xs text-slate-400">Showing {visibleRequests.length} of {requests.length} requests</div></div>

          <div className="space-y-6"><div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-[#102b3f]">Request health</p><p className="mt-1 text-xs text-slate-500">Live status distribution</p></div><CheckCircle2 className="text-[#16766d]" size={20} /></div><div className="mt-6 space-y-4"><ProgressRow label="Pending" value={reports?.leave.pending ?? pendingRequests.length} total={Math.max(requests.length, 1)} color="bg-[#d7ae70]" /><ProgressRow label="Approved" value={reports?.leave.approved ?? approvedRequests.length} total={Math.max(requests.length, 1)} color="bg-[#16766d]" /><ProgressRow label="Rejected" value={reports?.leave.rejected ?? 0} total={Math.max(requests.length, 1)} color="bg-rose-400" /></div></div><div className="rounded-3xl bg-[#102b3f] p-6 text-white shadow-sm"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#b3d9d3]">Permission overview</p><p className="mt-3 text-3xl font-semibold">{reports?.permission.total ?? 0}</p><p className="mt-1 text-xs text-slate-300">permission requests in the database</p><div className="mt-5 grid grid-cols-3 gap-2 text-center text-[11px]"><div><p className="text-lg font-semibold text-[#cde8e3]">{reports?.permission.pending ?? 0}</p><p className="text-slate-400">Pending</p></div><div><p className="text-lg font-semibold text-[#cde8e3]">{reports?.permission.approved ?? 0}</p><p className="text-slate-400">Approved</p></div><div><p className="text-lg font-semibold text-[#cde8e3]">{reports?.permission.rejected ?? 0}</p><p className="text-slate-400">Rejected</p></div></div></div></div></section>
      </main>
    </div>
  );
}

function ProgressRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const percentage = Math.min(100, Math.round((value / total) * 100));
  return <div><div className="flex items-center justify-between text-xs"><span className="text-slate-500">{label}</span><span className="font-semibold text-slate-700">{value}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${color}`} style={{ width: `${percentage}%` }} /></div></div>;
}

function LeaveRequestsPage({
  requests,
  search,
  setSearch,
  filter,
  setFilter,
  onStatus,
}: {
  requests: LeaveRequest[];
  search: string;
  setSearch: (value: string) => void;
  filter: RequestStatus | 'All';
  setFilter: Dispatch<SetStateAction<RequestStatus | 'All'>>;
  onStatus: (id: number, status: RequestStatus) => void;
}) {
  const visibleRequests = requests.filter((request) => {
    const normalizedSearch = search.trim().toLowerCase();
    const matchesSearch = !normalizedSearch || [request.employee, request.department, request.type, request.dates].some((value) => value.toLowerCase().includes(normalizedSearch));
    return matchesSearch && (filter === 'All' || request.status === filter);
  });
  const pending = requests.filter((request) => request.status === 'Pending').length;
  const approved = requests.filter((request) => request.status === 'Approved').length;
  const totalDays = requests.reduce((total, request) => total + request.days, 0);

  return (
    <div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-10">
      <div className="flex flex-col justify-between gap-5 border-b border-slate-200 pb-7 md:flex-row md:items-end">
        <div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#25766c]">Workspace / requests</p><h1 className="text-3xl font-semibold tracking-tight text-[#102b3f]">Leave requests</h1><p className="mt-2 text-sm text-slate-500">Review every employee leave request from the central HR workflow.</p></div>
        <div className="flex items-center gap-2"><span className="rounded-xl bg-[#fff2dc] px-3 py-2 text-xs font-semibold text-[#a76b17]">{pending} pending</span><span className="rounded-xl bg-[#e6f3f1] px-3 py-2 text-xs font-semibold text-[#16766d]">Live backend data</span></div>
      </div>

      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={FileCheck2} label="Total requests" value={`${requests.length}`} detail="all" detailText="from the database" iconClass="bg-[#e6f3f1] text-[#16766d]" />
        <StatCard icon={Clock3} label="Awaiting review" value={`${pending}`} detail="now" detailText="need an HR decision" iconClass="bg-[#fff2dc] text-[#c88828]" />
        <StatCard icon={CheckCircle2} label="Approved" value={`${approved}`} detail="live" detailText="approved requests" iconClass="bg-[#e8f6eb] text-[#26834b]" />
        <StatCard icon={CalendarDays} label="Requested days" value={`${totalDays}`} detail="days" detailText="across all requests" iconClass="bg-[#edf0f8] text-[#6575a8]" />
      </section>

      <section className="mt-7 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_2px_12px_rgba(16,43,63,0.04)]">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div><h2 className="text-lg font-semibold text-[#102b3f]">All leave requests</h2><p className="mt-1 text-xs text-slate-500">Search by employee, department, leave type or date.</p></div>
          <div className="flex flex-col gap-2 sm:flex-row"><div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search leave requests" placeholder="Search requests" className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs outline-none focus:border-[#81bcb4] focus:bg-white sm:w-64" /></div><select aria-label="Filter leave requests" value={filter} onChange={(event) => setFilter(event.target.value as RequestStatus | 'All')} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 outline-none focus:border-[#81bcb4]"><option value="All">All statuses</option><option value="Pending">Pending</option><option value="Approved">Approved</option><option value="Rejected">Rejected</option></select></div>
        </div>

        <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left"><thead className="bg-slate-50"><tr className="text-[10px] uppercase tracking-[0.14em] text-slate-400"><th className="px-6 py-4 font-semibold">Employee</th><th className="px-4 py-4 font-semibold">Leave type</th><th className="px-4 py-4 font-semibold">Period</th><th className="px-4 py-4 font-semibold">Days</th><th className="px-4 py-4 font-semibold">Status</th><th className="px-4 py-4 text-right font-semibold">Decision</th></tr></thead><tbody>{visibleRequests.map((request) => <tr key={request.id} className="border-t border-slate-100 hover:bg-slate-50/70"><td className="px-6 py-4"><div className="flex items-center gap-3"><div className={`grid h-10 w-10 place-items-center rounded-full ${request.color}`}><span className="text-[11px] font-bold">{request.initials}</span></div><div><p className="text-sm font-semibold text-slate-700">{request.employee}</p><p className="text-xs text-slate-400">{request.department}</p></div></div></td><td className="px-4 py-4 text-sm text-slate-600">{request.type}</td><td className="px-4 py-4 text-sm text-slate-600">{request.dates}</td><td className="px-4 py-4 text-sm font-semibold text-slate-700">{request.days}</td><td className="px-4 py-4"><StatusPill status={request.status} /></td><td className="px-4 py-4 text-right">{request.status === 'Pending' ? <div className="flex justify-end gap-2"><button onClick={() => onStatus(request.id, 'Approved')} className="rounded-lg bg-emerald-50 px-3 py-2 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-100">Approve</button><button onClick={() => onStatus(request.id, 'Rejected')} className="rounded-lg bg-rose-50 px-3 py-2 text-[10px] font-semibold text-rose-700 hover:bg-rose-100">Reject</button></div> : <span className="text-xs text-slate-400">Decision recorded</span>}</td></tr>)}</tbody></table></div>
        {visibleRequests.length === 0 && <div className="p-12 text-center"><FileText className="mx-auto text-slate-300" size={28} /><p className="mt-3 text-sm font-semibold text-slate-600">No leave requests found</p><p className="mt-1 text-xs text-slate-400">Try another search or status filter.</p></div>}
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4 text-xs text-slate-400 sm:px-6"><span>Showing {visibleRequests.length} of {requests.length} requests</span><span>Synced with Laravel API</span></div>
      </section>
    </div>
  );
}

function HrDashboard({
  leaveRequests, permissionRequests, reports, notifications, employees, categories, hrReport, onLeaveStatus, onPermissionStatus, onLogout, selectedNotification, onNotificationOpen, onNotificationClose,
}: {
  leaveRequests: LeaveRequest[]; permissionRequests: PermissionRequestItem[]; reports: { leave: RequestReport; permission: RequestReport } | null; notifications: NotificationItem[]; employees: AuthUser[]; categories: LeaveCategory[]; hrReport: HrReport | null; onLeaveStatus: (id: number, status: RequestStatus) => void; onPermissionStatus: (id: number, status: RequestStatus) => void; onLogout: () => void; selectedNotification: NotificationItem | null; onNotificationOpen: (notification: NotificationItem) => void; onNotificationClose: () => void;
}) {
  const [section, setSection] = useState('Overview');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [categoryForm, setCategoryForm] = useState({ name: '', allowance: '', eligibility: '' });
  const [localCategories, setLocalCategories] = useState(categories);
  const [balance, setBalance] = useState<{ employee?: AuthUser; annual: { allowance: number; used: number; remaining: number }; permission: { allowance: number; used: number; remaining: number } } | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [notice, setNotice] = useState('');
  const headers = { Accept: 'application/json', Authorization: `Bearer ${localStorage.getItem(TOKEN_STORAGE_KEY) ?? ''}` };

  useEffect(() => setLocalCategories(categories), [categories]);
  const loadBalance = async (id: number) => { const response = await fetch(`/api/hr/leave-balances/${id}`, { headers, credentials: 'include' }); if (response.ok) setBalance(await response.json()); };
  const addCategory = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const response = await fetch('/api/hr/leave-categories', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(categoryForm) }); if (!response.ok) { setNotice('Category could not be created.'); return; } const data = await response.json(); setLocalCategories((current) => [...current, data.category]); setCategoryForm({ name: '', allowance: '', eligibility: '' }); setNotice('Leave category created.'); };
  const deleteCategory = async (id: number) => { const response = await fetch(`/api/hr/leave-categories/${id}`, { method: 'DELETE', headers, credentials: 'include' }); if (response.ok) { setLocalCategories((current) => current.filter((category) => category.id !== id)); setNotice('Leave category deleted.'); } };
  const filteredEmployees = employees.filter((employee) => employee.name.toLowerCase().includes(employeeSearch.toLowerCase()) || employee.email.toLowerCase().includes(employeeSearch.toLowerCase()));
  const navigation = [{ label: 'Overview', icon: LayoutDashboard }, { label: 'Manage employee records', icon: Users }, { label: 'Manage leave categories', icon: FileText }, { label: 'Monitor leave balance', icon: CalendarDays }, { label: 'Generate reports', icon: FileCheck2 }];

  return <div className="min-h-screen bg-[#f6f8fb] text-slate-900"><aside className="fixed inset-y-0 left-0 z-40 hidden w-[272px] flex-col bg-[#102b3f] px-5 py-6 text-white lg:flex"><BrandLogo subtitle="HR workspace" /><div className="my-8 h-px bg-white/10" /><p className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Human resources</p><nav className="mt-3 space-y-1.5">{navigation.map(({ label, icon: Icon }) => <button key={label} onClick={() => setSection(label)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium ${section === label ? 'bg-[#1f485b] text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}><Icon size={18} />{label}</button>)}</nav><div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-xs font-semibold">Private HR control</p><p className="mt-1 text-[11px] leading-5 text-slate-400">Manage employee records, eligibility and balances.</p></div></aside><div className="lg:ml-[272px]"><header className="flex h-[74px] items-center justify-between border-b border-slate-200 bg-white/90 px-5 sm:px-8"><div className="flex items-center gap-4"><div className="lg:hidden"><BrandLogo compact /></div><div><p className="text-xs text-slate-400">HR workspace</p><p className="text-sm font-semibold text-[#102b3f]">{section}</p></div></div><div className="flex items-center gap-3"><NotificationBell notifications={notifications} onOpen={onNotificationOpen} /><button onClick={onLogout} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Logout</button></div></header><div className="border-b border-slate-200 bg-white px-5 py-3 lg:hidden"><div className="flex gap-2 overflow-x-auto">{navigation.map(({ label, icon: Icon }) => <button key={label} onClick={() => setSection(label)} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${section === label ? 'bg-[#16766d] text-white' : 'bg-slate-100 text-slate-600'}`}><Icon size={14} />{label}</button>)}</div></div>

{section === 'Overview' && <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8"><div className="mb-8"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#25766c]">Human resources</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#102b3f]">Requests control center</h1><p className="mt-2 text-sm text-slate-500">Manage leave workflows and employee information from one place.</p></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><StatCard icon={FileCheck2} label="Leave requests" value={`${reports?.leave.total ?? leaveRequests.length}`} detail={`${reports?.leave.pending ?? 0}`} detailText="pending review" iconClass="bg-[#e6f3f1] text-[#16766d]" /><StatCard icon={CalendarDays} label="Permission" value={`${reports?.permission.total ?? permissionRequests.length}`} detail={`${reports?.permission.pending ?? 0}`} detailText="pending review" iconClass="bg-[#fff2dc] text-[#c88828]" /><StatCard icon={CheckCircle2} label="Approved leave" value={`${reports?.leave.approved ?? 0}`} detail="live" detailText="from the database" iconClass="bg-[#e8f6eb] text-[#26834b]" /><StatCard icon={Bell} label="Unread alerts" value={`${notifications.filter((item) => !item.read_at).length}`} detail="HR" detailText="new employee activity" iconClass="bg-[#edf0f8] text-[#6575a8]" /></div><section className="mt-8 grid gap-6 xl:grid-cols-2"><RequestQueue title="Leave requests" description="Approve or reject employee leave requests." requests={leaveRequests} onStatus={onLeaveStatus} /><PermissionQueue requests={permissionRequests} onStatus={onPermissionStatus} /></section></main>}

{section === 'Manage employee records' && <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#25766c]">HR records</p><h1 className="mt-2 text-3xl font-semibold text-[#102b3f]">Manage employee records</h1><p className="mt-2 text-sm text-slate-500">View and maintain employee information stored in CREMIN-CAM.</p><input value={employeeSearch} onChange={(event) => setEmployeeSearch(event.target.value)} placeholder="Search employees" className="mt-7 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm sm:max-w-md" /><div className="mt-5 grid gap-3">{filteredEmployees.map((employee) => <div key={employee.id} className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center"><div><p className="font-semibold text-slate-700">{employee.name}</p><p className="mt-1 text-xs text-slate-500">{employee.email} · {employee.title ?? 'Employee'}</p><p className="mt-1 text-xs text-slate-400">{employee.department ?? 'No department'} · ID {employee.employeeId ?? 'Not assigned'}</p></div><button onClick={() => { setSelectedEmployee(employee.id); void loadBalance(employee.id); setSection('Monitor leave balance'); }} className="rounded-xl bg-[#e6f3f1] px-3 py-2 text-xs font-semibold text-[#16766d]">View record and balance</button></div>)}</div></main>}

{section === 'Manage leave categories' && <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#25766c]">HR policy</p><h1 className="mt-2 text-3xl font-semibold text-[#102b3f]">Manage leave categories</h1><p className="mt-2 text-sm text-slate-500">Add, define eligibility and remove unused leave categories.</p><form onSubmit={addCategory} className="mt-7 grid gap-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-4"><input required value={categoryForm.name} onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })} placeholder="Category name" className="h-11 rounded-xl border border-slate-200 px-3 text-sm" /><input value={categoryForm.allowance} onChange={(event) => setCategoryForm({ ...categoryForm, allowance: event.target.value })} placeholder="Allowance" className="h-11 rounded-xl border border-slate-200 px-3 text-sm" /><input value={categoryForm.eligibility} onChange={(event) => setCategoryForm({ ...categoryForm, eligibility: event.target.value })} placeholder="Eligibility rule" className="h-11 rounded-xl border border-slate-200 px-3 text-sm" /><button className="rounded-xl bg-[#16766d] px-4 py-2 text-xs font-semibold text-white">Add category</button></form><div className="mt-6 grid gap-4 md:grid-cols-2">{localCategories.map((category) => <div key={category.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div><h2 className="font-semibold text-[#102b3f]">{category.name}</h2><p className="mt-2 text-sm text-slate-600">{category.allowance}</p><p className="mt-2 text-xs text-slate-400">{category.eligibility}</p></div><button onClick={() => void deleteCategory(category.id)} className="rounded-lg bg-rose-50 px-2 py-1.5 text-[10px] font-semibold text-rose-700">Delete</button></div></div>)}</div></main>}

{section === 'Monitor leave balance' && <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#25766c]">HR monitoring</p><h1 className="mt-2 text-3xl font-semibold text-[#102b3f]">Monitor leave balance</h1><p className="mt-2 text-sm text-slate-500">Check allocated, used and remaining days for each employee.</p><div className="mt-7 grid gap-3">{employees.map((employee) => <button key={employee.id} onClick={() => { setSelectedEmployee(employee.id); void loadBalance(employee.id); }} className={`flex items-center justify-between rounded-2xl border bg-white p-5 text-left shadow-sm ${selectedEmployee === employee.id ? 'border-[#16766d]' : 'border-slate-200'}`}><span><span className="block font-semibold text-slate-700">{employee.name}</span><span className="mt-1 block text-xs text-slate-400">{employee.department ?? 'No department'}</span></span><span className="text-xs font-semibold text-[#16766d]">View balance</span></button>)}</div>{balance && <div className="mt-6 grid gap-4 md:grid-cols-3"><StatCard icon={CalendarDays} label="Annual allocated" value={`${balance.annual.allowance}`} detail={`${balance.annual.used} used`} detailText={`${balance.annual.remaining} remaining`} iconClass="bg-[#e6f3f1] text-[#16766d]" /><StatCard icon={Clock3} label="Permission allocated" value={`${balance.permission.allowance}`} detail={`${balance.permission.used} used`} detailText={`${balance.permission.remaining} remaining`} iconClass="bg-[#fff2dc] text-[#c88828]" /><StatCard icon={ShieldCheck} label="Employee" value={balance.employee?.name ?? ''} detail="tracked" detailText="authorized HR view" iconClass="bg-[#edf0f8] text-[#6575a8]" /></div>}</main>}

{section === 'Generate reports' && <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#25766c]">HR analytics</p><h1 className="mt-2 text-3xl font-semibold text-[#102b3f]">Generate reports</h1><p className="mt-2 text-sm text-slate-500">Current workforce and leave activity report.</p><div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4"><StatCard icon={Users} label="Total employees" value={`${hrReport?.total_employees ?? employees.length}`} detail="active" detailText="employee records" iconClass="bg-[#edf0f8] text-[#6575a8]" /><StatCard icon={CalendarDays} label="Employees on leave" value={`${hrReport?.employees_on_leave ?? 0}`} detail="today" detailText="approved active leave" iconClass="bg-[#fff2dc] text-[#c88828]" /><StatCard icon={CheckCircle2} label="Approved this month" value={`${hrReport?.approved_this_month ?? 0}`} detail="requests" detailText="approved leave" iconClass="bg-[#e8f6eb] text-[#26834b]" /><StatCard icon={Clock3} label="Pending leave" value={`${hrReport?.pending_leave ?? 0}`} detail="requests" detailText="awaiting decision" iconClass="bg-[#e6f3f1] text-[#16766d]" /></div></main>}
</div>{notice && <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-[#102b3f] px-4 py-3 text-sm font-medium text-white shadow-xl">{notice}</div>}{selectedNotification && <NotificationDetail notification={selectedNotification} onClose={onNotificationClose} />}</div>;
}

export function LegacyHrDashboard({
  leaveRequests,
  permissionRequests,
  reports,
  notifications,
  onLeaveStatus,
  onPermissionStatus,
  onLogout,
}: {
  leaveRequests: LeaveRequest[];
  permissionRequests: PermissionRequestItem[];
  reports: { leave: RequestReport; permission: RequestReport } | null;
  notifications: NotificationItem[];
  onLeaveStatus: (id: number, status: RequestStatus) => void;
  onPermissionStatus: (id: number, status: RequestStatus) => void;
  onLogout: () => void;
}) {
  const pendingNotifications = notifications.filter((notification) => !notification.read_at);

  return (
    <div className="min-h-screen bg-[#f6f8fb] text-slate-900">
      <header className="border-b border-slate-200 bg-white/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#dfeeea] text-[#0b4b45]"><ShieldCheck size={24} /></div><div><p className="text-sm font-bold uppercase tracking-[0.18em] text-[#102b3f]">CREMIN-CAM</p><p className="text-[11px] text-slate-500">HR workspace</p></div></div>
          <div className="flex items-center gap-3"><span className="hidden rounded-xl bg-[#fff2dc] px-3 py-2 text-xs font-semibold text-[#a76b17] sm:inline-flex">{pendingNotifications.length} notifications</span><button onClick={onLogout} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Disconnect</button></div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <div className="mb-8"><p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#25766c]">Human resources</p><h1 className="text-3xl font-semibold tracking-tight text-[#102b3f]">Requests control center</h1><p className="mt-2 text-sm text-slate-500">Review, decide and report on employee leave and permission requests.</p></div>

        <section className="grid gap-4 md:grid-cols-4">
          <StatCard icon={FileCheck2} label="Leave requests" value={`${reports?.leave.total ?? leaveRequests.length}`} detail={`${reports?.leave.pending ?? 0}`} detailText="pending review" iconClass="bg-[#e6f3f1] text-[#16766d]" />
          <StatCard icon={CalendarDays} label="Permission requests" value={`${reports?.permission.total ?? permissionRequests.length}`} detail={`${reports?.permission.pending ?? 0}`} detailText="pending review" iconClass="bg-[#fff2dc] text-[#c88828]" />
          <StatCard icon={CheckCircle2} label="Approved leave" value={`${reports?.leave.approved ?? 0}`} detail="live" detailText="from the database" iconClass="bg-[#e8f6eb] text-[#26834b]" />
          <StatCard icon={Bell} label="Unread alerts" value={`${pendingNotifications.length}`} detail="HR" detailText="new employee activity" iconClass="bg-[#edf0f8] text-[#6575a8]" />
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-2">
          <RequestQueue title="Leave requests" description="The private HR leave queue." requests={leaveRequests} onStatus={onLeaveStatus} />
          <PermissionQueue requests={permissionRequests} onStatus={onPermissionStatus} />
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1fr_0.8fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-sm font-semibold text-[#102b3f]">Request report</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><ReportBlock title="Leave" report={reports?.leave} /><ReportBlock title="Permission" report={reports?.permission} /></div></div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-sm font-semibold text-[#102b3f]">Notification inbox</p><div className="mt-4 space-y-3">{notifications.slice(0, 5).map((notification) => <div key={notification.id} className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">{notification.data.message ?? 'New employee request'}<span className="mt-1 block text-[10px] text-slate-400">{notification.read_at ? 'Read' : 'Unread'}</span></div>)}{notifications.length === 0 && <p className="text-xs text-slate-400">No notifications yet.</p>}</div></div>
        </section>
      </main>
    </div>
  );
}

function RequestQueue({ title, description, requests, onStatus }: { title: string; description: string; requests: LeaveRequest[]; onStatus: (id: number, status: RequestStatus) => void }) {
  return <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-[#102b3f]">{title}</p><p className="mt-1 text-xs text-slate-500">{description}</p></div><span className="rounded-lg bg-[#e6f3f1] px-2.5 py-1.5 text-[11px] font-semibold text-[#16766d]">{requests.length} total</span></div><div className="mt-5 space-y-3">{requests.map((request) => <div key={request.id} className="flex flex-col gap-3 rounded-2xl border border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-slate-700">{request.employee}</p><p className="mt-1 text-xs text-slate-500">{request.type} · {request.dates} · {request.days} day(s)</p></div><div className="flex items-center gap-2"><StatusPill status={request.status} />{request.status === 'Pending' && <><button onClick={() => onStatus(request.id, 'Approved')} className="rounded-lg bg-emerald-50 px-2 py-1.5 text-[10px] font-semibold text-emerald-700">Approve</button><button onClick={() => onStatus(request.id, 'Rejected')} className="rounded-lg bg-rose-50 px-2 py-1.5 text-[10px] font-semibold text-rose-700">Reject</button></>}</div></div>)}{requests.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-xs text-slate-400">No leave requests.</p>}</div></div>;
}

function PermissionQueue({ requests, onStatus }: { requests: PermissionRequestItem[]; onStatus: (id: number, status: RequestStatus) => void }) {
  return <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-[#102b3f]">Permission requests</p><p className="mt-1 text-xs text-slate-500">The private HR permission queue.</p></div><span className="rounded-lg bg-[#fff2dc] px-2.5 py-1.5 text-[11px] font-semibold text-[#a76b17]">{requests.length} total</span></div><div className="mt-5 space-y-3">{requests.map((request) => <div key={request.id} className="flex flex-col gap-3 rounded-2xl border border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-slate-700">{request.employee ?? 'Employee'}</p><p className="mt-1 text-xs text-slate-500">{request.dates} · 1 day</p></div><div className="flex items-center gap-2"><StatusPill status={request.status} />{request.status === 'Pending' && <><button onClick={() => onStatus(request.id, 'Approved')} className="rounded-lg bg-emerald-50 px-2 py-1.5 text-[10px] font-semibold text-emerald-700">Approve</button><button onClick={() => onStatus(request.id, 'Rejected')} className="rounded-lg bg-rose-50 px-2 py-1.5 text-[10px] font-semibold text-rose-700">Reject</button></>}</div></div>)}{requests.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-xs text-slate-400">No permission requests.</p>}</div></div>;
}

function ReportBlock({ title, report }: { title: string; report?: RequestReport }) {
  return <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-700">{title}</p><div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]"><div><p className="text-lg font-semibold text-[#102b3f]">{report?.approved ?? 0}</p><p className="text-slate-400">Approved</p></div><div><p className="text-lg font-semibold text-[#a76b17]">{report?.pending ?? 0}</p><p className="text-slate-400">Pending</p></div><div><p className="text-lg font-semibold text-rose-600">{report?.rejected ?? 0}</p><p className="text-slate-400">Rejected</p></div></div></div>;
}

export function AdminManagementPanel({ employees, settings, onCreateEmployee, onDeleteEmployee, onSaveSettings, onDownloadBackup }: { employees: AuthUser[]; settings: Record<string, string>; onCreateEmployee: (employee: { name: string; email: string; password: string }) => void; onDeleteEmployee: (id: number) => void; onSaveSettings: (settings: Record<string, string>) => void; onDownloadBackup: () => void }) {
  const [companyName, setCompanyName] = useState(settings.company_name ?? 'CREMIN-CAM');
  const [annualDays, setAnnualDays] = useState(settings.annual_leave_days ?? '18');
  const [newEmployee, setNewEmployee] = useState({ name: '', email: '', password: 'Password123!' });

  useEffect(() => {
    setCompanyName(settings.company_name ?? 'CREMIN-CAM');
    setAnnualDays(settings.annual_leave_days ?? '18');
  }, [settings]);

  return <section className="mb-6 grid gap-6 xl:grid-cols-[1fr_0.8fr]"><div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-[#102b3f]">Employee management</p><p className="mt-1 text-xs text-slate-500">Admin-only employee directory.</p></div><span className="rounded-lg bg-[#e6f3f1] px-2.5 py-1.5 text-[11px] font-semibold text-[#16766d]">{employees.length} employees</span></div><form onSubmit={(event) => { event.preventDefault(); onCreateEmployee(newEmployee); setNewEmployee({ name: '', email: '', password: 'Password123!' }); }} className="mt-4 grid gap-2 sm:grid-cols-3"><input required value={newEmployee.name} onChange={(event) => setNewEmployee((current) => ({ ...current, name: event.target.value }))} placeholder="Full name" className="h-10 rounded-xl border border-slate-200 px-3 text-sm" /><input required type="email" value={newEmployee.email} onChange={(event) => setNewEmployee((current) => ({ ...current, email: event.target.value }))} placeholder="Professional email" className="h-10 rounded-xl border border-slate-200 px-3 text-sm" /><button className="rounded-xl bg-[#16766d] px-3 py-2 text-xs font-semibold text-white">Add employee</button></form><div className="mt-4 space-y-2">{employees.map((employee) => <div key={employee.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3"><div><p className="text-sm font-semibold text-slate-700">{employee.name}</p><p className="text-[11px] text-slate-400">{employee.email} · {employee.department ?? 'No department'}</p></div><button onClick={() => onDeleteEmployee(employee.id)} className="rounded-lg bg-rose-50 px-2 py-1.5 text-[10px] font-semibold text-rose-700">Delete</button></div>)}{employees.length === 0 && <p className="text-xs text-slate-400">No employees found.</p>}</div></div><div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-sm font-semibold text-[#102b3f]">System administration</p><div className="mt-4 space-y-3"><label className="block text-xs font-semibold text-slate-600">Company name<input value={companyName} onChange={(event) => setCompanyName(event.target.value)} className="mt-2 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-normal" /></label><label className="block text-xs font-semibold text-slate-600">Annual leave days<input value={annualDays} onChange={(event) => setAnnualDays(event.target.value)} className="mt-2 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-normal" /></label><div className="flex flex-wrap gap-2 pt-2"><button onClick={() => onSaveSettings({ company_name: companyName, annual_leave_days: annualDays })} className="rounded-xl bg-[#16766d] px-3 py-2 text-xs font-semibold text-white">Save settings</button><button onClick={onDownloadBackup} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Download backup</button></div></div></div></section>;
}

function EmployeeDashboard({
  employeeProfile,
  setEmployeeProfile,
  employeeRequests,
  leaveForm,
  setLeaveForm,
  permissionForm,
  setPermissionForm,
  submitLeaveRequest,
  submitPermissionRequest,
  saveProfile,
  notifications,
  employeeBalance,
  employeePolicy,
  notice,
  onLogout,
}: {
  employeeProfile: EmployeeProfile;
  setEmployeeProfile: Dispatch<SetStateAction<EmployeeProfile>>;
  employeeRequests: EmployeeRequestItem[];
  leaveForm: { type: string; startDate: string; endDate: string; reason: string };
  setLeaveForm: Dispatch<SetStateAction<{ type: string; startDate: string; endDate: string; reason: string }>>;
  permissionForm: { date: string; reason: string };
  setPermissionForm: Dispatch<SetStateAction<{ date: string; reason: string }>>;
  submitLeaveRequest: (event: FormEvent<HTMLFormElement>) => void;
  submitPermissionRequest: (event: FormEvent<HTMLFormElement>) => void;
  saveProfile: (profile?: EmployeeProfile) => void;
  notifications: NotificationItem[];
  employeeBalance: EmployeeBalance | null;
  employeePolicy: EmployeePolicy | null;
  notice: string;
  onLogout: () => void;
}) {
  const [section, setSection] = useState('Overview');
  const [picture, setPicture] = useState(employeeProfile.avatar ?? '');
  const [profileDraft, setProfileDraft] = useState(employeeProfile);
  const unreadNotifications = notifications.filter((notification) => !notification.read_at);
  const approvedRequests = employeeRequests.filter((request) => request.status === 'Approved').length;
  const annualRemaining = employeeBalance?.annual.remaining ?? 0;
  const permissionRemaining = employeeBalance?.permission.remaining ?? 0;

  useEffect(() => setProfileDraft(employeeProfile), [employeeProfile]);
  useEffect(() => setPicture(employeeProfile.avatar ?? ''), [employeeProfile.avatar]);

  const navigation = [
    { label: 'Overview', icon: LayoutDashboard },
    { label: 'Profile management', icon: PencilLine },
    { label: 'Leave application', icon: CalendarDays },
    { label: 'Permission request', icon: Clock3 },
    { label: 'Status', icon: FileCheck2 },
    { label: 'Notifications', icon: Bell },
  ];

  const choosePicture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPicture(String(reader.result));
    reader.readAsDataURL(file);
  };

  const saveProfileChanges = () => {
    const nextProfile = { ...profileDraft, avatar: picture };
    setEmployeeProfile(nextProfile);
    saveProfile(nextProfile);
  };

  const initials = employeeProfile.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="role-employee min-h-screen bg-[#f6f8fb] text-slate-900">
      <aside className="employee-sidebar fixed inset-y-0 left-0 z-40 hidden w-[272px] flex-col bg-[#102b3f] px-5 py-6 text-white lg:flex">
        <BrandLogo subtitle="Employee portal" tone="light" />
        <div className="my-8 h-px bg-white/10" /><p className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">My workspace</p>
        <nav className="mt-3 space-y-1.5">{navigation.map(({ label, icon: Icon }) => <button key={label} onClick={() => setSection(label)} className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-sm font-medium transition ${section === label ? 'bg-[#1f485b] text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}><span className="flex items-center gap-3"><Icon size={18} />{label}</span>{label === 'Notifications' && unreadNotifications.length > 0 && <span className="rounded-md bg-[#d7ae70] px-2 py-0.5 text-[10px] text-[#102b3f]">{unreadNotifications.length}</span>}</button>)}</nav>
        <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-xs font-semibold">Employee support</p><p className="mt-1.5 text-[11px] leading-5 text-slate-400">Stay informed about company policies and request decisions.</p></div>
      </aside>

      <div className="lg:ml-[272px]"><header className="flex h-[74px] items-center justify-between border-b border-slate-200 bg-white/90 px-5 sm:px-8"><div className="flex items-center gap-4"><div className="lg:hidden"><BrandLogo compact /></div><div><p className="text-xs text-slate-400">Employee workspace</p><p className="text-sm font-semibold text-[#102b3f]">{section}</p></div></div><div className="flex items-center gap-2"><span className="hidden rounded-xl bg-[#e6f3f1] px-3 py-2 text-xs font-semibold text-[#16766d] sm:inline-flex">Connected</span><button onClick={onLogout} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Logout</button></div></header><div className="border-b border-slate-200 bg-white px-5 py-3 lg:hidden"><div className="flex gap-2 overflow-x-auto">{navigation.map(({ label, icon: Icon }) => <button key={label} onClick={() => setSection(label)} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${section === label ? 'bg-[#16766d] text-white' : 'bg-slate-100 text-slate-600'}`}><Icon size={14} />{label}</button>)}</div></div>

        {section === 'Overview' && <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8"><div className="mb-8"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#25766c]">Welcome back</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#102b3f]">Hello, {employeeProfile.name}</h1><p className="mt-2 text-sm text-slate-500">Here is your personal leave and permission workspace.</p></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><StatCard icon={FileCheck2} label="Annual leave" value={`${annualRemaining}`} detail={`${employeeBalance?.annual.allowance ?? employeePolicy?.annual_leave_days ?? 18} days/year`} detailText="remaining balance" iconClass="bg-[#e6f3f1] text-[#16766d]" /><StatCard icon={CalendarDays} label="Permission" value={`${permissionRemaining}`} detail={`${employeeBalance?.permission.allowance ?? employeePolicy?.permission_days ?? 12} days`} detailText="personal matters" iconClass="bg-[#fff2dc] text-[#c88828]" /><StatCard icon={CheckCircle2} label="Approved requests" value={`${employeeBalance?.approved_requests ?? approvedRequests}`} detail="live" detailText="approved in the system" iconClass="bg-[#e8f6eb] text-[#26834b]" /><StatCard icon={Users} label="Leave types" value={`${employeePolicy?.leave_types.length ?? 0}`} detail="available" detailText="annual, sick, maternity and more" iconClass="bg-[#edf0f8] text-[#6575a8]" /></div></main>}

        {section === 'Profile management' && <main className="mx-auto max-w-4xl px-5 py-8 sm:px-8"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#25766c]">My profile</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#102b3f]">Profile management</h1><p className="mt-2 text-sm text-slate-500">Keep your employee information up to date.</p><div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><div className="flex flex-col items-center gap-4 border-b border-slate-100 pb-6 sm:flex-row"><label className="relative grid h-24 w-24 cursor-pointer place-items-center overflow-hidden rounded-full bg-[#d9c6a5] text-xl font-bold text-[#5b4833]"><input type="file" accept="image/*" onChange={choosePicture} className="sr-only" />{picture ? <img src={picture} alt="Employee profile" className="h-full w-full object-cover" /> : initials}<span className="absolute bottom-0 left-0 right-0 bg-[#102b3f]/75 py-1 text-center text-[9px] font-medium text-white">Photo</span></label><div><p className="text-base font-semibold text-[#102b3f]">{profileDraft.name}</p><p className="mt-1 text-sm text-slate-500">{profileDraft.title} · {profileDraft.department}</p><p className="mt-1 text-xs text-slate-400">Employee ID: {profileDraft.employeeId}</p></div></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><ProfileInput label="Name" value={profileDraft.name} onChange={(value) => setProfileDraft({ ...profileDraft, name: value })} /><ProfileInput label="Position" value={profileDraft.title} onChange={(value) => setProfileDraft({ ...profileDraft, title: value })} /><ProfileInput label="Department" value={profileDraft.department} onChange={(value) => setProfileDraft({ ...profileDraft, department: value })} /><ProfileInput label="Employee ID" value={profileDraft.employeeId} onChange={(value) => setProfileDraft({ ...profileDraft, employeeId: value })} /></div><div className="mt-6 flex gap-2"><button onClick={saveProfileChanges} className="rounded-lg bg-[#16766d] px-4 py-2.5 text-xs font-semibold text-white">Save changes</button><button onClick={() => setProfileDraft(employeeProfile)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600">Cancel</button></div></div></main>}

        {section === 'Leave application' && <ApplicationCard title="Leave application" badge={`${employeePolicy?.annual_leave_days ?? 18} days/year`} description="Apply for annual, sick, maternity or exceptional leave." form={<form onSubmit={submitLeaveRequest} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><FormSelect label="Leave type" value={leaveForm.type} options={employeePolicy?.leave_types ?? ['Annual leave', 'Maternity leave', 'Sick leave', 'Exceptional leave']} onChange={(value) => setLeaveForm((current) => ({ ...current, type: value, reason: value === 'Annual leave' ? '' : current.reason }))} /><div className="space-y-2"><label className="block text-xs font-semibold text-slate-600">Reason</label><textarea value={leaveForm.type === 'Annual leave' ? '' : leaveForm.reason} disabled={leaveForm.type === 'Annual leave'} onChange={(event) => setLeaveForm((current) => ({ ...current, reason: event.target.value }))} placeholder={leaveForm.type === 'Annual leave' ? 'No reason required for annual leave.' : 'Describe the reason for this leave.'} className="mt-2 h-28 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-normal text-slate-700 outline-none transition focus:border-[#81bcb4] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400" required={leaveForm.type !== 'Annual leave'} /></div></div><div className="grid gap-4 sm:grid-cols-2"><FormField label="Start date" type="date" value={leaveForm.startDate} onChange={(value) => setLeaveForm((current) => ({ ...current, startDate: value }))} /><FormField label="End date" type="date" value={leaveForm.endDate} onChange={(value) => setLeaveForm((current) => ({ ...current, endDate: value }))} /></div><button className="rounded-lg bg-[#16766d] px-4 py-2.5 text-xs font-semibold text-white">+ Submit leave request</button></form>} />}

        {section === 'Permission request' && <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8"><div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]"><ApplicationCard title="Permission request" badge={`${employeePolicy?.permission_days ?? 12} days`} description="Use permission days for personal matters." form={<form onSubmit={submitPermissionRequest} className="space-y-4"><FormField label="Permission date" type="date" value={permissionForm.date} onChange={(value) => setPermissionForm((current) => ({ ...current, date: value }))} /><label className="block text-xs font-semibold text-slate-600">Reason<textarea value={permissionForm.reason} onChange={(event) => setPermissionForm((current) => ({ ...current, reason: event.target.value }))} className="mt-2 h-28 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-normal" /></label><button className="rounded-lg bg-[#16766d] px-4 py-2.5 text-xs font-semibold text-white">+ Submit permission request</button></form>} /><div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-base font-semibold text-[#102b3f]">Leave policy essentials</p><div className="mt-5 space-y-4 text-sm text-slate-600"><div className="rounded-xl bg-[#f5f9f8] p-4"><p className="font-semibold text-slate-800">Annual leave</p><p className="mt-1">Employees of {employeePolicy?.company_name ?? 'CREMIN-CAM'} are entitled to {employeePolicy?.annual_leave_days ?? 18} days of annual leave per year, generally taken in separate periods rather than all at once.</p></div><div className="rounded-xl bg-[#fffaf0] p-4"><p className="font-semibold text-slate-800">Permission days</p><p className="mt-1">The organization grants usually {employeePolicy?.permission_days ?? 12} permission days for personal matters. {employeePolicy?.permission_note ?? ''}</p></div></div></div></div></main>}

        {section === 'Status' && <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#25766c]">My requests</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#102b3f]">Leave and permission status</h1><p className="mt-2 text-sm text-slate-500">Track all requests made by you.</p><div className="mt-8 overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm"><table className="w-full min-w-[650px] text-left"><thead className="bg-slate-50 text-[10px] uppercase tracking-[0.14em] text-slate-400"><tr><th className="px-6 py-4">Type</th><th className="px-4 py-4">Dates</th><th className="px-4 py-4">Days</th><th className="px-4 py-4">Status</th></tr></thead><tbody>{employeeRequests.map((request) => <tr key={request.id} className="border-t border-slate-100"><td className="px-6 py-4 text-sm font-semibold text-slate-700">{request.type}</td><td className="px-4 py-4 text-sm text-slate-600">{request.dates}</td><td className="px-4 py-4 text-sm text-slate-600">{request.days}</td><td className="px-4 py-4"><StatusPill status={request.status} /></td></tr>)}</tbody></table>{employeeRequests.length === 0 && <p className="p-8 text-sm text-slate-400">No requests yet.</p>}</div></main>}

        {section === 'Notifications' && <main className="mx-auto max-w-4xl px-5 py-8 sm:px-8"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#25766c]">Company information</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#102b3f]">Notifications</h1><p className="mt-2 text-sm text-slate-500">Important updates and information from CREMIN-CAM.</p><div className="mt-8 space-y-4">{notifications.map((notification) => <div key={notification.id} className={`rounded-2xl border p-5 ${notification.read_at ? 'border-slate-200 bg-white' : 'border-[#b9ddd7] bg-[#f5f9f8]'}`}><div className="flex items-start gap-3"><Bell className="mt-0.5 shrink-0 text-[#16766d]" size={18} /><div><p className="text-sm font-semibold text-slate-700">{notification.data.message ?? 'New company information'}</p><p className="mt-1 text-xs text-slate-400">{notification.read_at ? 'Read notification' : 'New notification'}</p></div></div></div>)}{notifications.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">No new company information at the moment.</div>}</div></main>}
      </div>
      {notice && <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-[#102b3f] px-4 py-3 text-sm font-medium text-white shadow-xl">{notice}</div>}
    </div>
  );
}

function ProfileInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block text-xs font-semibold text-slate-600">{label}<input value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-normal" /></label>;
}

function FormField({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="block text-xs font-semibold text-slate-600">{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-normal" required /></label>;
}

function FormSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <label className="block text-xs font-semibold text-slate-600">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-normal">{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}

function ApplicationCard({ title, badge, description, form }: { title: string; badge: string; description: string; form: React.ReactNode }) {
  return <main className="mx-auto max-w-4xl px-5 py-8 sm:px-8"><div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><p className="text-xl font-semibold text-[#102b3f]">{title}</p><p className="mt-1 text-sm text-slate-500">{description}</p></div><span className="rounded-lg bg-[#e6f3f1] px-3 py-2 text-xs font-semibold text-[#16766d]">{badge}</span></div><div className="mt-7">{form}</div></div></main>;
}

export function LegacyEmployeeDashboard({
  employeeProfile,
  setEmployeeProfile,
  profileEditorOpen,
  setProfileEditorOpen,
  employeeRequests,
  leaveForm,
  setLeaveForm,
  permissionForm,
  setPermissionForm,
  submitLeaveRequest,
  submitPermissionRequest,
  saveProfile,
  notice,
  onLogout,
}: {
  employeeProfile: EmployeeProfile;
  setEmployeeProfile: Dispatch<SetStateAction<EmployeeProfile>>;
  profileEditorOpen: boolean;
  setProfileEditorOpen: (value: boolean) => void;
  employeeRequests: EmployeeRequestItem[];
  leaveForm: { type: string; startDate: string; endDate: string; reason: string };
  setLeaveForm: Dispatch<SetStateAction<{ type: string; startDate: string; endDate: string; reason: string }>>;
  permissionForm: { date: string; reason: string };
  setPermissionForm: Dispatch<SetStateAction<{ date: string; reason: string }>>;
  submitLeaveRequest: (event: FormEvent<HTMLFormElement>) => void;
  submitPermissionRequest: (event: FormEvent<HTMLFormElement>) => void;
  saveProfile: () => void;
  notice: string;
  onLogout: () => void;
}) {
  const annualUsed = 6;
  const annualRemaining = 18 - annualUsed;
  const permissionUsed = 4;
  const permissionRemaining = 12 - permissionUsed;

  return (
    <div className="min-h-screen bg-[#f6f8fb] text-slate-900">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#dfeeea] text-[#0b4b45]">
              <ShieldCheck size={24} />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#102b3f]">CREMIN-CAM</p>
              <p className="text-[11px] text-slate-500">Employee portal</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="hidden rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 sm:inline-flex">My notifications</button>
            <button onClick={onLogout} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Disconnect</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#25766c]">Welcome back</p>
            <h1 className="text-3xl font-semibold tracking-tight text-[#102b3f]">Hello, {employeeProfile.name.split(' ')[0]}</h1>
            <p className="mt-2 text-sm text-slate-500">Your leave, permissions and profile are all in one place.</p>
          </div>

          <button onClick={() => setProfileEditorOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-[#16766d] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#12645d]">
            <PencilLine size={16} />
            Update profile
          </button>
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={FileCheck2} label="Annual leave" value={`${annualRemaining}`} detail="18 days" detailText="remaining this year" iconClass="bg-[#e6f3f1] text-[#16766d]" />
          <StatCard icon={CalendarDays} label="Permission" value={`${permissionRemaining}`} detail="10–12 days" detailText="personal days" iconClass="bg-[#fff2dc] text-[#c88828]" />
          <StatCard icon={CheckCircle2} label="Approved requests" value="02" detail="3 total" detailText="this quarter" iconClass="bg-[#e8f6eb] text-[#26834b]" />
          <StatCard icon={Users} label="Leave types" value="07" detail="+" detailText="including sick, maternity and more" iconClass="bg-[#edf0f8] text-[#6575a8]" />
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_2px_12px_rgba(16,43,63,0.03)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[#102b3f]">Apply for leave</p>
                <p className="mt-1 text-xs text-slate-500">Request a new annual or sick leave.</p>
              </div>
              <span className="rounded-lg bg-[#e6f3f1] px-2.5 py-1.5 text-[11px] font-semibold text-[#16766d]">18 days / year</span>
            </div>

            <form onSubmit={submitLeaveRequest} className="mt-5 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-xs font-semibold text-slate-600">
                  Leave type
                  <select value={leaveForm.type} onChange={(event) => setLeaveForm((current) => ({ ...current, type: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none focus:border-[#81bcb4]">
                    <option>Annual leave</option>
                    <option>Maternity leave</option>
                    <option>Sick leave</option>
                    <option>Exceptional leave</option>
                  </select>
                </label>

                <label className="block text-xs font-semibold text-slate-600">
                  Reason
                  <input value={leaveForm.type === 'Annual leave' ? '' : leaveForm.reason} disabled={leaveForm.type === 'Annual leave'} placeholder={leaveForm.type === 'Annual leave' ? 'No reason required for annual leave.' : 'Describe the reason for this leave.'} onChange={(event) => setLeaveForm((current) => ({ ...current, reason: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none focus:border-[#81bcb4] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400" required={leaveForm.type !== 'Annual leave'} />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-xs font-semibold text-slate-600">
                  Start date
                  <input type="date" value={leaveForm.startDate} onChange={(event) => setLeaveForm((current) => ({ ...current, startDate: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none focus:border-[#81bcb4]" />
                </label>
                <label className="block text-xs font-semibold text-slate-600">
                  End date
                  <input type="date" value={leaveForm.endDate} onChange={(event) => setLeaveForm((current) => ({ ...current, endDate: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none focus:border-[#81bcb4]" />
                </label>
              </div>

              <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-[#16766d] px-4 py-3 text-sm font-semibold text-white hover:bg-[#12645d]">
                <Plus size={16} />
                Submit leave request
              </button>
            </form>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_2px_12px_rgba(16,43,63,0.03)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[#102b3f]">My profile</p>
                <p className="mt-1 text-xs text-slate-500">Employee information</p>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-full bg-[#d9c6a5] text-xs font-bold text-[#5b4833]">{employeeProfile.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div>
            </div>

            <div className="mt-5 space-y-3 text-sm text-slate-600">
              <div className="rounded-xl bg-slate-50 p-3"><span className="block text-[11px] uppercase tracking-[0.14em] text-slate-400">Name</span><span className="mt-1 block font-medium text-slate-700">{employeeProfile.name}</span></div>
              <div className="rounded-xl bg-slate-50 p-3"><span className="block text-[11px] uppercase tracking-[0.14em] text-slate-400">Position</span><span className="mt-1 block font-medium text-slate-700">{employeeProfile.title}</span></div>
              <div className="rounded-xl bg-slate-50 p-3"><span className="block text-[11px] uppercase tracking-[0.14em] text-slate-400">Department</span><span className="mt-1 block font-medium text-slate-700">{employeeProfile.department}</span></div>
              <div className="rounded-xl bg-slate-50 p-3"><span className="block text-[11px] uppercase tracking-[0.14em] text-slate-400">Employee ID</span><span className="mt-1 block font-medium text-slate-700">{employeeProfile.employeeId}</span></div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_2px_12px_rgba(16,43,63,0.03)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[#102b3f]">Permission request</p>
                <p className="mt-1 text-xs text-slate-500">Personal matters and short absences.</p>
              </div>
              <span className="rounded-lg bg-[#fff2dc] px-2.5 py-1.5 text-[11px] font-semibold text-[#c88828]">10–12 days</span>
            </div>

            <form onSubmit={submitPermissionRequest} className="mt-5 space-y-4">
              <label className="block text-xs font-semibold text-slate-600">
                Permission date
                <input type="date" value={permissionForm.date} onChange={(event) => setPermissionForm((current) => ({ ...current, date: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none focus:border-[#81bcb4]" />
              </label>

              <label className="block text-xs font-semibold text-slate-600">
                Reason
                <textarea value={permissionForm.reason} onChange={(event) => setPermissionForm((current) => ({ ...current, reason: event.target.value }))} className="mt-2 h-24 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#81bcb4]" />
              </label>

              <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-[#16766d] px-4 py-3 text-sm font-semibold text-white hover:bg-[#12645d]">
                <Plus size={16} />
                Submit permission request
              </button>
            </form>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_2px_12px_rgba(16,43,63,0.03)]">
            <p className="text-sm font-semibold text-[#102b3f]">Leave policy essentials</p>
            <div className="mt-5 space-y-4 text-sm text-slate-600">
              <div className="rounded-xl bg-[#f5f9f8] p-4">
                <p className="font-semibold text-slate-800">Annual leave</p>
                <p className="mt-1 text-slate-600">Employees of CREMIN-CAM are entitled to 18 days of annual leave per year, usually taken in separate periods rather than all at once.</p>
              </div>
              <div className="rounded-xl bg-[#fffaf0] p-4">
                <p className="font-semibold text-slate-800">Permission days</p>
                <p className="mt-1 text-slate-600">The organization grants between 10 and 12 permission days per year for personal matters and administrative obligations.</p>
              </div>
              <div className="rounded-xl bg-[#f6f8ff] p-4">
                <p className="font-semibold text-slate-800">Other leave types</p>
                <p className="mt-1 text-slate-600">Sick leave, maternity leave, exceptional leave and other family-related leave are also available according to policy.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_2px_12px_rgba(16,43,63,0.03)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[#102b3f]">Leave and permission status</p>
              <p className="mt-1 text-xs text-slate-500">Track all requests made by the employee.</p>
            </div>
            <span className="rounded-lg bg-[#e6f3f1] px-2.5 py-1.5 text-[11px] font-semibold text-[#16766d]">{employeeRequests.length} requests</span>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.14em] text-slate-400">
                <tr>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Dates</th>
                  <th className="px-4 py-3">Days</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {employeeRequests.map((request) => (
                  <tr key={request.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-700">{request.type}</td>
                    <td className="px-4 py-3 text-slate-600">{request.dates}</td>
                    <td className="px-4 py-3 text-slate-600">{request.days} day(s)</td>
                    <td className="px-4 py-3"><StatusPill status={request.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {notice && <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-[#102b3f] px-4 py-3 text-sm font-medium text-white shadow-xl">{notice}</div>}

      {profileEditorOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#102b3f]/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[#102b3f]">Edit profile</h2>
                <p className="mt-1 text-xs text-slate-500">Update your personal information before your next leave request.</p>
              </div>
              <button onClick={() => setProfileEditorOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
            </div>

            <div className="mt-6 space-y-4">
              <label className="block text-xs font-semibold text-slate-600">
                Full name
                <input value={employeeProfile.name} onChange={(event) => setEmployeeProfile((current) => ({ ...current, name: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none focus:border-[#81bcb4]" />
              </label>
              <label className="block text-xs font-semibold text-slate-600">
                Position
                <input value={employeeProfile.title} onChange={(event) => setEmployeeProfile((current) => ({ ...current, title: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none focus:border-[#81bcb4]" />
              </label>
              <label className="block text-xs font-semibold text-slate-600">
                Department
                <input value={employeeProfile.department} onChange={(event) => setEmployeeProfile((current) => ({ ...current, department: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none focus:border-[#81bcb4]" />
              </label>
              <label className="block text-xs font-semibold text-slate-600">
                Phone
                <input value={employeeProfile.phone} onChange={(event) => setEmployeeProfile((current) => ({ ...current, phone: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none focus:border-[#81bcb4]" />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setProfileEditorOpen(false)} className="rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-100">Cancel</button>
              <button onClick={saveProfile} className="rounded-xl bg-[#16766d] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#12645d]">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationBell({ notifications, onOpen }: { notifications: NotificationItem[]; onOpen: (notification: NotificationItem) => void }) {
  const unread = notifications.filter((notification) => !notification.read_at);

  return (
    <div className="group relative">
      <button aria-label={`${unread.length} unread notifications`} className="relative rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800">
        <Bell size={19} strokeWidth={1.8} />
        {unread.length > 0 && <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white ring-2 ring-white">{unread.length}</span>}
      </button>
      <div className="invisible absolute right-0 top-12 z-30 w-80 translate-y-1 rounded-2xl border border-slate-200 bg-white p-2 opacity-0 shadow-xl transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
        <div className="flex items-center justify-between px-3 py-2"><p className="text-xs font-bold text-[#102b3f]">Request notifications</p><span className="text-[10px] text-slate-400">{unread.length} unread</span></div>
        <div className="max-h-72 space-y-1 overflow-y-auto">
          {notifications.length === 0 && <p className="px-3 py-4 text-xs text-slate-400">No request notifications.</p>}
          {notifications.slice(0, 8).map((notification) => <button key={notification.id} onClick={() => onOpen(notification)} className={`w-full rounded-xl p-3 text-left transition hover:bg-[#f5f9f8] ${notification.read_at ? 'bg-white' : 'bg-[#edf8f6]'}`}><span className="flex items-start gap-2"><Bell size={15} className="mt-0.5 shrink-0 text-[#16766d]" /><span><span className="block text-xs font-semibold text-slate-700">{notification.data.message ?? 'New request received'}</span><span className="mt-1 block text-[11px] text-slate-400">{notification.read_at ? 'Read' : 'Unread'} · Click to view details</span></span></span></button>)}
        </div>
      </div>
    </div>
  );
}

function NotificationDetail({ notification, onClose }: { notification: NotificationItem; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#102b3f]/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-label="Request notification details" className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#25766c]">New {notification.data.request_type ?? 'request'}</p><h2 className="mt-2 text-xl font-semibold text-[#102b3f]">{notification.data.employee_name ?? 'Employee request'}</h2></div><button aria-label="Close notification details" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={18} /></button></div>
        <div className="mt-6 space-y-3"><div className="rounded-xl bg-slate-50 p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Message</p><p className="mt-1 text-sm text-slate-700">{notification.data.message}</p></div><div className="rounded-xl bg-[#f5f9f8] p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#25766c]">Reason provided</p><p className="mt-1 text-sm leading-6 text-slate-700">{notification.data.reason || 'No reason was provided.'}</p></div></div>
        <button onClick={onClose} className="mt-6 w-full rounded-xl bg-[#16766d] px-4 py-3 text-xs font-semibold text-white hover:bg-[#12645d]">Close</button>
      </section>
    </div>
  );
}

function BrandLogo({ subtitle, compact = false, tone = compact ? 'dark' : 'light' }: { subtitle?: string; compact?: boolean; tone?: 'dark' | 'light' }) {
  const isLight = tone === 'light';

  return (
    <div className={`flex items-center ${compact ? 'gap-2' : 'gap-3 px-2'}`}>
      <img src="/assets/images/smart%20staff.png" alt="Smart Staff logo" className={`${compact ? 'h-9 w-9' : 'h-11 w-11'} shrink-0 rounded-xl object-contain shadow-sm`} />
      <div className="min-w-0">
        <p className={`truncate text-base font-extrabold tracking-[0.02em] ${isLight ? 'text-white' : 'text-[#102b3f]'}`}>CREMIN-CAM</p>
        {subtitle && <p className={`mt-0.5 truncate text-[10px] uppercase tracking-[0.16em] ${isLight ? 'text-slate-300' : 'text-slate-500'}`}>{subtitle}</p>}
      </div>
    </div>
  );
}

function WelcomeScreen({ onContinue, onExplore }: { onContinue: () => void; onExplore: () => void }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#edf3f5] px-6 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(22,118,109,0.12),transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(80,136,111,0.12),transparent_28%)]" />
      <div className="absolute left-6 top-6 flex items-center gap-3 rounded-full border border-white/70 bg-white/80 px-3 py-2 shadow-sm backdrop-blur-sm">
        <img src="/assets/images/smart%20staff.png" alt="Smart Staff logo" className="h-10 w-10 rounded-xl object-contain" />
        <div>
          <p className="text-sm font-extrabold tracking-[0.08em] text-[#102b3f]">SMART STAFF</p>
          <p className="text-[9px] uppercase tracking-[0.2em] text-slate-500">People operations</p>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-5xl rounded-[32px] border border-slate-200 bg-white/80 p-8 shadow-[0_28px_80px_rgba(16,43,63,0.12)] backdrop-blur-sm md:p-12">
        <div className="grid items-center gap-10 md:grid-cols-[1.1fr_0.9fr]">
          <div>
            <span className="inline-flex rounded-full border border-[#cde8e3] bg-[#edf9f7] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#16766d]">
              Welcome to Smart Staff
            </span>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-[#102b3f] md:text-5xl">
              Manage people, leave, and approvals from one place.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
              A streamlined workforce platform for employees, HR teams, and administrators to handle requests, reviews, and communication securely.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={onContinue} className="inline-flex items-center justify-center rounded-xl bg-[#16766d] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(22,118,109,0.18)] transition hover:bg-[#12645d]">
                Access sign-in
              </button>
              <button type="button" onClick={onExplore} className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                Explore features
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <div className="relative flex h-[320px] w-full max-w-[340px] items-center justify-center rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#f7faf9,#ebf4f4)] p-6 shadow-inner">
              <div className="absolute inset-5 rounded-[22px] border border-dashed border-slate-200" />
              <div className="relative flex flex-col items-center justify-center text-center">
                <img src="/assets/images/smart%20staff.png" alt="Smart Staff logo" className="h-28 w-28 rounded-[28px] object-contain shadow-[0_18px_30px_rgba(16,43,63,0.08)]" />
                <p className="mt-6 text-2xl font-bold tracking-tight text-[#102b3f]">Smart Staff</p>
                <p className="mt-2 text-sm uppercase tracking-[0.18em] text-slate-500">Workforce platform</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExploreFeaturesScreen({ onBackToWelcome, onAccessSignin }: { onBackToWelcome: () => void; onAccessSignin: () => void }) {
  const services = [
    {
      title: 'Leave management',
      description: 'Employees submit annual, sick, maternity, and exceptional leave requests directly from the app.',
      accent: 'bg-[#e6f3f1] text-[#16766d]',
    },
    {
      title: 'Permission requests',
      description: 'Staff can request short permissions with reasons and dates, visible to HR for quick review.',
      accent: 'bg-[#fff2dc] text-[#bf7a1a]',
    },
    {
      title: 'HR review center',
      description: 'HR and administrators receive notifications, inspect requests, and approve or reject them securely.',
      accent: 'bg-[#ebf0ff] text-[#465fae]',
    },
    {
      title: 'Employee profile & balance',
      description: 'Users track balances, policy guidance, and personal details from their dedicated dashboard.',
      accent: 'bg-[#f3e8ff] text-[#7c57b2]',
    },
  ];

  const steps = [
    'Sign in with your professional account.',
    'Submit a leave or permission request with your reason.',
    'HR or admin reviews and decides in real time.',
    'Track status and reports from your dashboard.',
  ];

  return (
    <div className="min-h-screen bg-[#edf3f5] px-5 py-8 text-[#102b3f] md:px-8">
      <header className="mx-auto flex max-w-6xl items-center justify-between rounded-full border border-slate-200 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <img src="/assets/images/smart%20staff.png" alt="Smart Staff logo" className="h-10 w-10 rounded-xl object-contain" />
          <div>
            <p className="text-sm font-extrabold tracking-[0.08em] text-[#102b3f]">SMART STAFF</p>
            <p className="text-[9px] uppercase tracking-[0.2em] text-slate-500">Cremin-Cam</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onBackToWelcome} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Home
          </button>
          <button type="button" onClick={onAccessSignin} className="rounded-xl bg-[#16766d] px-4 py-2 text-sm font-semibold text-white hover:bg-[#12645d]">
            Sign in
          </button>
        </div>
      </header>

      <main className="mx-auto mt-8 max-w-6xl">
        <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(16,43,63,0.08)] md:p-10">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <span className="inline-flex rounded-full border border-[#cde8e3] bg-[#edf9f7] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#16766d]">
                Our services
              </span>
              <h1 className="mt-5 text-3xl font-bold tracking-tight md:text-5xl">
                Smart solutions for people operations.
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
                Cremin-Cam brings together employee requests, HR oversight, and administrative reporting in one digital workspace.
              </p>
            </div>

            <div className="flex items-center justify-center">
              <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#f8faf9,#edf5f4)] p-6 text-center shadow-inner">
                <img src="/assets/images/smart%20staff.png" alt="Smart Staff logo" className="mx-auto h-24 w-24 rounded-[24px] object-contain shadow-[0_18px_30px_rgba(16,43,63,0.08)]" />
                <p className="mt-4 text-2xl font-bold tracking-tight">Smart Staff</p>
                <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-500">Operational excellence</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {services.map((service) => (
            <article key={service.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className={`mb-4 inline-flex rounded-xl px-2.5 py-2 text-sm font-semibold ${service.accent}`}>
                {service.title.split(' ')[0]}
              </div>
              <h2 className="text-lg font-bold text-[#102b3f]">{service.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{service.description}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(16,43,63,0.06)] md:p-8">
          <h2 className="text-2xl font-bold text-[#102b3f]">How it works</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {steps.map((step, index) => (
              <div key={step} className="rounded-2xl border border-slate-200 bg-[#f8fafb] p-4">
                <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#16766d] text-sm font-bold text-white">
                  {index + 1}
                </div>
                <p className="text-sm leading-6 text-slate-700">{step}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function LoginScreen({
  email,
  password,
  role,
  setEmail,
  setPassword,
  loginError,
  loginLoading,
  onSubmit,
  onBackToWelcome,
}: {
  email: string;
  password: string;
  role: Role;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
  loginError: string;
  loginLoading: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onBackToWelcome: () => void;
}) {
  return (
    <div className={`login-shell login-${role.toLowerCase()} flex min-h-screen items-center justify-center px-4 py-10`}>
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_20px_45px_rgba(16,43,63,0.08)]">
        <div className="mb-6 flex items-center gap-3">
          <img src="/assets/images/smart%20staff.png" alt="Smart Staff logo" className="h-12 w-12 rounded-2xl object-contain shadow-sm" />
          <div>
            <p className="text-lg font-bold text-[#102b3f]">CREMIN-CAM</p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Professional access</p>
          </div>
        </div>

        <div className="mb-5 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-[#102b3f]">Connexion</h1>
          <button type="button" onClick={onBackToWelcome} className="text-xs font-semibold text-[#16766d] hover:text-[#12645d]">
            Home
          </button>
        </div>
        <p className="mt-2 text-sm text-slate-500">Access the HR dashboard and manage leave requests securely.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Professional email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@company.com"
              className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition focus:border-[#81bcb4] focus:bg-white"
              required
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Your password"
              className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition focus:border-[#81bcb4] focus:bg-white"
              required
            />
          </label>

          {loginError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {loginError}
            </div>
          )}

          <button type="submit" disabled={loginLoading} className="flex h-11 w-full items-center justify-center rounded-xl bg-[#16766d] text-sm font-semibold text-white transition hover:bg-[#12645d] disabled:cursor-not-allowed disabled:opacity-60">
            {loginLoading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div className="mt-5 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
          Demo accounts : <span className="font-semibold text-slate-700">admin@cremin-cam.com</span>, <span className="font-semibold text-slate-700">hr@cremin-cam.com</span> or <span className="font-semibold text-slate-700">employee@cremin-cam.com</span>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, detail, detailText, iconClass }: { icon: typeof FileCheck2; label: string; value: string; detail: string; detailText: string; iconClass: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_2px_12px_rgba(16,43,63,0.03)] transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between"><div className={`grid h-10 w-10 place-items-center rounded-xl ${iconClass}`}><Icon size={19} strokeWidth={2} /></div><ArrowUpRight size={16} className="text-slate-300" /></div><p className="mt-5 text-xs font-medium text-slate-500">{label}</p><div className="mt-1.5 flex items-baseline gap-2"><p className="text-2xl font-semibold tracking-tight text-[#152d3d]">{value}</p><span className="text-[11px] font-semibold text-[#2a9960]">{detail}</span></div><p className="mt-1 text-[11px] text-slate-400">{detailText}</p></div>;
}

function StatusPill({ status }: { status: RequestStatus }) {
  const styles: Record<RequestStatus, string> = { Pending: 'bg-amber-50 text-amber-700 ring-amber-600/10', Approved: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10', Rejected: 'bg-rose-50 text-rose-700 ring-rose-600/10' };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ring-inset ${styles[status]}`}>{status}</span>;
}

function BalanceRow({ color, label, value }: { color: string; label: string; value: string }) {
  return <div className="flex items-center gap-2.5"><span className={`h-2 w-2 rounded-full ${color}`} /><span className="w-20 text-slate-500">{label}</span><span className="font-semibold text-slate-700">{value}</span></div>;
}

export default App;
