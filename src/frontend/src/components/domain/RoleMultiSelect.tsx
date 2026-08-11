import { MultiSelect } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { AppRole } from '../../types/auth';
import { ALL_ROLES } from '../../types/user';

interface RoleMultiSelectProps {
  label?: string;
  value: AppRole[];
  onChange: (roles: AppRole[]) => void;
}

export function RoleMultiSelect({ label, value, onChange }: RoleMultiSelectProps) {
  const { t } = useTranslation(['common']);
  const data = ALL_ROLES.map((role) => ({ value: role, label: t(`roles.${role}`) }));

  return (
    <MultiSelect
      label={label}
      data={data}
      value={value}
      onChange={(roles) => onChange(roles as AppRole[])}
      clearable
      searchable
    />
  );
}
