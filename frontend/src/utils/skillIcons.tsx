import React from 'react';
import type { SvgIconProps } from '@mui/material';
import PsychologyIcon from '@mui/icons-material/Psychology';
import LanguageIcon from '@mui/icons-material/Language';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import CodeIcon from '@mui/icons-material/Code';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import StorageIcon from '@mui/icons-material/Storage';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import SecurityIcon from '@mui/icons-material/Security';
import HubIcon from '@mui/icons-material/Hub';
import Javascript from '@mui/icons-material/Javascript';

const DEFAULT = CodeIcon;

/** MUI icons keyed by skill name — matches backend seed names. */
const BY_NAME: Record<string, React.ElementType<SvgIconProps>> = {
  'Machine Learning': PsychologyIcon,
  'Web Development': LanguageIcon,
  DSA: AccountTreeIcon,
  Python: CodeIcon,
  'Cloud & DevOps': CloudQueueIcon,
  'Data Engineering': StorageIcon,
  'AI & LLMs': SmartToyIcon,
  Cybersecurity: SecurityIcon,
  'System Design': HubIcon,
  TypeScript: Javascript,
};

export function SkillTrackIcon({
  name,
  color,
  size = 28,
}: {
  name: string;
  color: string;
  size?: number;
}) {
  const Icon = BY_NAME[name] ?? DEFAULT;
  return <Icon sx={{ fontSize: size, color }} />;
}
