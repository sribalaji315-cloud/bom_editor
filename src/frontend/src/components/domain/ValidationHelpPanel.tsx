import { Accordion, Badge, Code, Drawer, List, Stack, Table, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { CHECK_USAGE, type CheckArgumentUsage } from '../validationChecks';
import type { ValidationMetadata } from '../../types/validation';

interface ValidationHelpPanelProps {
  opened: boolean;
  metadata: ValidationMetadata | undefined;
  onClose: () => void;
}

const OPERATOR_KEYS = [
  'eq',
  'ne',
  'gt',
  'gte',
  'lt',
  'lte',
  'contains',
  'startswith',
  'in',
  'notIn',
  'isEmpty',
  'isNotEmpty',
] as const;

const EXAMPLE_KEYS = ['assemblies', 'leaves', 'notRoot', 'byClass', 'staged', 'withCondition'] as const;

const USAGE_COLORS: Record<CheckArgumentUsage, string> = {
  required: 'nordRed',
  optional: 'nordAmber',
  ignored: 'gray',
};

function UsageBadge({ usage }: { usage: CheckArgumentUsage }) {
  const { t } = useTranslation(['validation']);
  return (
    <Badge size="sm" variant="light" color={USAGE_COLORS[usage]}>
      {t(`help.usage.${usage}`)}
    </Badge>
  );
}

export function ValidationHelpPanel({ opened, metadata, onClose }: ValidationHelpPanelProps) {
  const { t } = useTranslation(['validation']);
  const checks = metadata?.ruleTypes ?? [];

  return (
    <Drawer opened={opened} onClose={onClose} position="right" size="xl" title={t('help.title')}>
      <Stack gap="md">
        <Text c="dimmed">{t('help.intro')}</Text>

        <Accordion multiple defaultValue={['flow']} variant="separated">
          <Accordion.Item value="flow">
            <Accordion.Control>{t('help.flow.title')}</Accordion.Control>
            <Accordion.Panel>
              <List type="ordered" spacing="xs" size="sm">
                <List.Item>{t('help.flow.step1')}</List.Item>
                <List.Item>{t('help.flow.step2')}</List.Item>
                <List.Item>{t('help.flow.step3')}</List.Item>
                <List.Item>{t('help.flow.step4')}</List.Item>
              </List>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="code">
            <Accordion.Control>{t('help.fields.code.title')}</Accordion.Control>
            <Accordion.Panel>
              <Stack gap="xs">
                <Text size="sm">{t('help.fields.code.body')}</Text>
                <Text size="sm" c="dimmed">
                  {t('help.fields.code.note')}
                </Text>
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="name">
            <Accordion.Control>{t('help.fields.name.title')}</Accordion.Control>
            <Accordion.Panel>
              <Text size="sm">{t('help.fields.name.body')}</Text>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="check">
            <Accordion.Control>{t('help.fields.check.title')}</Accordion.Control>
            <Accordion.Panel>
              <Stack gap="sm">
                <Text size="sm">{t('help.fields.check.body')}</Text>
                <Table verticalSpacing="xs" horizontalSpacing="sm" withTableBorder>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>{t('help.fields.check.colCheck')}</Table.Th>
                      <Table.Th>{t('help.fields.check.colMeaning')}</Table.Th>
                      <Table.Th w={170}>{t('help.fields.check.colField')}</Table.Th>
                      <Table.Th w={210}>{t('help.fields.check.colParameters')}</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {checks.map((check) => (
                      <Table.Tr key={check}>
                        <Table.Td>
                          <Text size="sm" fw={500}>
                            {t(`rules.checkLabels.${check}`)}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs">{t(`rules.checks.${check}`)}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Stack gap={4} align="flex-start">
                            <UsageBadge usage={CHECK_USAGE[check].field} />
                            {CHECK_USAGE[check].field !== 'ignored' && (
                              <Text size="xs" c="dimmed">
                                {t(`rules.form.targetFieldFor.${check}`)}
                              </Text>
                            )}
                          </Stack>
                        </Table.Td>
                        <Table.Td>
                          <Stack gap={4} align="flex-start">
                            <UsageBadge usage={CHECK_USAGE[check].parameters} />
                            {CHECK_USAGE[check].parameters !== 'ignored' && (
                              <>
                                <Text size="xs" c="dimmed">
                                  {t(`rules.form.parametersFor.${check}`)}
                                </Text>
                                <Code>{t(`rules.form.parametersHintFor.${check}`)}</Code>
                              </>
                            )}
                          </Stack>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="severity">
            <Accordion.Control>{t('help.fields.severity.title')}</Accordion.Control>
            <Accordion.Panel>
              <Stack gap="xs">
                <Text size="sm">
                  <Badge size="sm" variant="light" color="nordRed">
                    {t('rules.severity.Error')}
                  </Badge>{' '}
                  {t('help.fields.severity.error')}
                </Text>
                <Text size="sm">
                  <Badge size="sm" variant="light" color="nordAmber">
                    {t('rules.severity.Warning')}
                  </Badge>{' '}
                  {t('help.fields.severity.warning')}
                </Text>
                <Text size="sm" c="dimmed">
                  {t('help.fields.severity.note')}
                </Text>
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="targetField">
            <Accordion.Control>{t('help.fields.targetField.title')}</Accordion.Control>
            <Accordion.Panel>
              <Stack gap="xs">
                <Text size="sm">{t('help.fields.targetField.body')}</Text>
                <Text size="sm">{t('help.fields.targetField.plm')}</Text>
                <Text size="sm" c="dimmed">
                  {t('help.fields.targetField.note')}
                </Text>
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="parameters">
            <Accordion.Control>{t('help.fields.parameters.title')}</Accordion.Control>
            <Accordion.Panel>
              <Stack gap="xs">
                <Text size="sm">{t('help.fields.parameters.body')}</Text>
                <List spacing={4} size="sm">
                  <List.Item>{t('help.fields.parameters.number')}</List.Item>
                  <List.Item>{t('help.fields.parameters.list')}</List.Item>
                  <List.Item>{t('help.fields.parameters.literals')}</List.Item>
                </List>
                <Text size="sm" c="dimmed">
                  {t('help.fields.parameters.formulaNote')}
                </Text>
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="appliesWhen">
            <Accordion.Control>{t('help.fields.appliesWhen.title')}</Accordion.Control>
            <Accordion.Panel>
              <Stack gap="sm">
                <Text size="sm">{t('help.fields.appliesWhen.body')}</Text>
                <Text size="sm">{t('help.fields.appliesWhen.shape')}</Text>

                <Table verticalSpacing="xs" horizontalSpacing="sm" withTableBorder>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th w={110}>{t('help.fields.appliesWhen.colOperator')}</Table.Th>
                      <Table.Th>{t('help.fields.appliesWhen.colMeaning')}</Table.Th>
                      <Table.Th>{t('help.fields.appliesWhen.colExample')}</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {OPERATOR_KEYS.map((key) => (
                      <Table.Tr key={key}>
                        <Table.Td>
                          <Code>{t(`help.operators.${key}.symbol`)}</Code>
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs">{t(`help.operators.${key}.meaning`)}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Code>{t(`help.operators.${key}.example`)}</Code>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>

                <Text size="sm" fw={500}>
                  {t('help.fields.appliesWhen.combining')}
                </Text>
                <Text size="sm">{t('help.fields.appliesWhen.combiningBody')}</Text>

                <Text size="sm" fw={500}>
                  {t('help.fields.appliesWhen.specialFields')}
                </Text>
                <List spacing={4} size="sm">
                  <List.Item>{t('help.fields.appliesWhen.level')}</List.Item>
                  <List.Item>{t('help.fields.appliesWhen.hasChildren')}</List.Item>
                  <List.Item>{t('help.fields.appliesWhen.booleans')}</List.Item>
                </List>
                {metadata && (
                  <Text size="xs" c="dimmed">
                    {t('rules.form.appliesWhenFields', { fields: metadata.filterFields.join(', ') })}
                  </Text>
                )}

                <Text size="sm" fw={500}>
                  {t('help.fields.appliesWhen.examples')}
                </Text>
                <Table verticalSpacing="xs" horizontalSpacing="sm" withTableBorder>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>{t('help.fields.appliesWhen.colGoal')}</Table.Th>
                      <Table.Th>{t('help.fields.appliesWhen.colCondition')}</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {EXAMPLE_KEYS.map((key) => (
                      <Table.Tr key={key}>
                        <Table.Td>
                          <Text size="xs">{t(`help.examples.${key}.goal`)}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Code>{t(`help.examples.${key}.condition`)}</Code>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
                <Text size="sm" c="dimmed">
                  {t('help.fields.appliesWhen.note')}
                </Text>
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="appliesToStatuses">
            <Accordion.Control>{t('help.fields.appliesToStatuses.title')}</Accordion.Control>
            <Accordion.Panel>
              <Stack gap="xs">
                <Text size="sm">{t('help.fields.appliesToStatuses.body')}</Text>
                <Text size="sm">{t('help.fields.appliesToStatuses.empty')}</Text>
                <Text size="sm">{t('help.fields.appliesToStatuses.evaluation')}</Text>
                <List spacing={4} size="sm">
                  <List.Item>{t('help.fields.appliesToStatuses.gateSubmit')}</List.Item>
                  <List.Item>{t('help.fields.appliesToStatuses.gateApprove')}</List.Item>
                  <List.Item>{t('help.fields.appliesToStatuses.gateRelease')}</List.Item>
                  <List.Item>{t('help.fields.appliesToStatuses.gateExport')}</List.Item>
                </List>
                <Text size="sm" c="dimmed">
                  {t('help.fields.appliesToStatuses.note')}
                </Text>
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="message">
            <Accordion.Control>{t('help.fields.message.title')}</Accordion.Control>
            <Accordion.Panel>
              <Stack gap="xs">
                <Text size="sm">{t('help.fields.message.body')}</Text>
                <List spacing={4} size="sm">
                  <List.Item>{t('help.fields.message.field')}</List.Item>
                  <List.Item>{t('help.fields.message.value')}</List.Item>
                  <List.Item>{t('help.fields.message.parameters')}</List.Item>
                </List>
                <Text size="sm" c="dimmed">
                  {t('help.fields.message.note')}
                </Text>
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="active">
            <Accordion.Control>{t('help.fields.active.title')}</Accordion.Control>
            <Accordion.Panel>
              <Text size="sm">{t('help.fields.active.body')}</Text>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="walkthrough">
            <Accordion.Control>{t('help.walkthrough.title')}</Accordion.Control>
            <Accordion.Panel>
              <Stack gap="xs">
                <Text size="sm">{t('help.walkthrough.goal')}</Text>
                <Table verticalSpacing="xs" horizontalSpacing="sm" withTableBorder>
                  <Table.Tbody>
                    <Table.Tr>
                      <Table.Td w={140}>{t('rules.form.code')}</Table.Td>
                      <Table.Td>
                        <Code>{t('help.walkthrough.code')}</Code>
                      </Table.Td>
                    </Table.Tr>
                    <Table.Tr>
                      <Table.Td>{t('rules.form.type')}</Table.Td>
                      <Table.Td>{t('rules.checkLabels.RequiredField')}</Table.Td>
                    </Table.Tr>
                    <Table.Tr>
                      <Table.Td>{t('rules.form.targetField')}</Table.Td>
                      <Table.Td>
                        <Code>route</Code>
                      </Table.Td>
                    </Table.Tr>
                    <Table.Tr>
                      <Table.Td>{t('rules.form.appliesWhen')}</Table.Td>
                      <Table.Td>
                        <Code>{t('help.walkthrough.appliesWhen')}</Code>
                      </Table.Td>
                    </Table.Tr>
                    <Table.Tr>
                      <Table.Td>{t('rules.form.severity')}</Table.Td>
                      <Table.Td>{t('rules.severity.Warning')}</Table.Td>
                    </Table.Tr>
                    <Table.Tr>
                      <Table.Td>{t('rules.form.message')}</Table.Td>
                      <Table.Td>{t('help.walkthrough.message')}</Table.Td>
                    </Table.Tr>
                  </Table.Tbody>
                </Table>
                <Text size="sm" c="dimmed">
                  {t('help.walkthrough.note')}
                </Text>
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </Stack>
    </Drawer>
  );
}
