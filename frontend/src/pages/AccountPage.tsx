import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';

import { AppCard } from '@/components/ui/AppCard';
import { Avatar } from '@/components/ui/Avatar';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ChangePasswordForm } from '@/features/account/ChangePasswordForm';
import { ProfileForm } from '@/features/account/ProfileForm';
import { useAuth } from '@/features/auth/useAuth';
import { formatDateTime } from '@/utils/format';

export function AccountPage() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <>
      <PageHeader
        title="Profile & security"
        description="Manage your personal details and password."
      />
      <Row className="g-3">
        <Col lg={4}>
          <AppCard>
            <div className="d-flex flex-column align-items-center text-center gap-2">
              <Avatar name={user.name} size="lg" decorative />
              <h2 className="fs-5 mb-0">{user.name}</h2>
              <p className="text-body-secondary mb-1">{user.email}</p>
              <div className="d-flex gap-2">
                <span className="badge text-bg-primary">{user.role.name}</span>
                <StatusBadge status={user.is_active ? 'active' : 'inactive'} />
              </div>
              <p className="small text-body-secondary mb-0">
                Member since {formatDateTime(user.created_at)}
              </p>
            </div>
          </AppCard>
        </Col>
        <Col lg={8}>
          <div className="d-flex flex-column gap-3">
            <AppCard title="Profile">
              <ProfileForm user={user} />
            </AppCard>
            <AppCard title="Change password">
              <ChangePasswordForm />
            </AppCard>
          </div>
        </Col>
      </Row>
    </>
  );
}
