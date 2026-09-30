import { Badge } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { BomDocumentStatus } from '../../types/bom';

const COLORS: Record<BomDocumentStatus, string> = {
  Draft: 'gray',
  InReview: 'nordAmber',
  Approved: 'nordGreen',
  Released: 'nordBlue',
};

export function BomStatusBadge({
  status,
  size,
}: {
  status: BomDocumentStatus;
  size?: string;
}) {
  const { t } = useTranslation(['bom']);
  return (
    <Badge color={COLORS[status]} variant="light" size={size}>
      {t(`status.${status}`)}
    </Badge>
  );
}
