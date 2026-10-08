import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import { Link } from 'react-router';

import { AppCard } from '@/components/ui/AppCard';
import { Icon, type IconName } from '@/components/ui/Icon';
import { PageHeader } from '@/components/ui/PageHeader';
import { type Permission, PERMISSIONS } from '@/features/auth/permissions';
import { useAuth } from '@/features/auth/useAuth';
import { StatCard } from '@/features/dashboard/StatCard';
import { ROUTES } from '@/routes/paths';

/** DEMO DATA — static placeholder metrics. Replace with a real metrics endpoint. */
const DEMO_STATS = [
  {
    label: 'Active users',
    value: '1,284',
    icon: 'people',
    tone: 'primary',
    trend: { direction: 'up', text: '4.2% vs last week' },
  },
  {
    label: 'New sign-ups',
    value: '96',
    icon: 'person-check',
    tone: 'success',
    trend: { direction: 'up', text: '12 today' },
  },
  {
    label: 'Pending reviews',
    value: '7',
    icon: 'exclamation-triangle',
    tone: 'warning',
    trend: { direction: 'down', text: '3 fewer than yesterday' },
  },
  { label: 'API uptime', value: '99.98%', icon: 'shield-check', tone: 'info' },
] as const satisfies readonly {
  label: string;
  value: string;
  icon: IconName;
  tone: 'primary' | 'success' | 'warning' | 'info';
  trend?: { direction: 'up' | 'down'; text: string };
}[];

const QUICK_LINKS: {
  label: string;
  description: string;
  to: string;
  icon: IconName;
  permission?: Permission;
}[] = [
  {
    label: 'Manage users',
    description: 'Search, filter and edit accounts',
    to: ROUTES.users,
    icon: 'people',
    permission: PERMISSIONS.USERS_READ,
  },
  {
    label: 'Manage roles',
    description: 'Review roles and assignments',
    to: ROUTES.roles,
    icon: 'shield-lock',
    permission: PERMISSIONS.ROLES_READ,
  },
  {
    label: 'Component library',
    description: 'Every reusable UI building block',
    to: ROUTES.components,
    icon: 'palette',
  },
  {
    label: 'Profile & security',
    description: 'Update your name or password',
    to: ROUTES.account,
    icon: 'person-circle',
  },
];

export function DashboardPage() {
  const { user, hasPermission } = useAuth();
  const links = QUICK_LINKS.filter((link) => hasPermission(link.permission));

  return (
    <>
      <PageHeader title="Dashboard" description={`Welcome back${user ? `, ${user.name}` : ''}.`} />

      <section aria-labelledby="metrics-heading" className="mb-4">
        <div className="d-flex align-items-center gap-2 mb-3">
          <h2 id="metrics-heading" className="fs-5 mb-0">
            Key metrics
          </h2>
          <span className="badge text-bg-warning">Demo data</span>
        </div>
        <Row xs={1} sm={2} xl={4} className="g-3">
          {DEMO_STATS.map((stat) => (
            <Col key={stat.label}>
              <StatCard {...stat} />
            </Col>
          ))}
        </Row>
      </section>

      <Row className="g-3">
        <Col lg={7}>
          <AppCard title="Quick links" subtitle="Shown according to your permissions.">
            <ul className="list-group list-group-flush">
              {links.map((link) => (
                <li key={link.to} className="list-group-item px-0">
                  <Link
                    to={link.to}
                    className="d-flex align-items-center gap-3 text-decoration-none"
                  >
                    <Icon name={link.icon} className="fs-5" />
                    <span>
                      <span className="d-block fw-semibold">{link.label}</span>
                      <span className="d-block small text-body-secondary">{link.description}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </AppCard>
        </Col>
        <Col lg={5}>
          <AppCard title="Your access" subtitle="Live data from the API (/auth/me).">
            {user && (
              <dl className="mb-0">
                <dt>Role</dt>
                <dd>
                  <span className="badge text-bg-primary">{user.role.name}</span>
                </dd>
                <dt>Permissions</dt>
                <dd className="mb-0">
                  {user.permissions.length > 0 ? (
                    <ul className="list-inline mb-0">
                      {user.permissions.map((permission) => (
                        <li key={permission} className="list-inline-item">
                          <code>{permission}</code>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-body-secondary">
                      No administrative permissions — standard user access only.
                    </span>
                  )}
                </dd>
              </dl>
            )}
          </AppCard>
        </Col>
      </Row>
    </>
  );
}
