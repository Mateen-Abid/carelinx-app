import React from 'react';
import { useTranslation } from 'react-i18next';

const URL_PATTERN = /(https?:\/\/[^\s<]+)/gi;

export const sanitizeHttpUrl = (raw: string): string | null => {
  const trimmed = raw.replace(/[),.;!?]+$/g, '');
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
};

export const extractHttpLinks = (value: string): { text: string; links: string[] } => {
  const links: string[] = [];
  const withoutUrls = String(value || '').replace(URL_PATTERN, (match) => {
    const href = sanitizeHttpUrl(match);
    if (href && !links.includes(href)) {
      links.push(href);
    }
    return ' ';
  });

  const text = withoutUrls
    .replace(/\s+,/g, ',')
    .replace(/,\s*,/g, ',')
    .replace(/\s+/g, ' ')
    .replace(/^,\s*|,\s*$/g, '')
    .trim();

  return { text, links };
};

interface LinkifiedTextProps {
  text: string;
  className?: string;
}

const LinkifiedText: React.FC<LinkifiedTextProps> = ({ text, className }) => {
  const { t } = useTranslation();
  const { text: displayText, links } = extractHttpLinks(text);

  if (!displayText && links.length === 0) {
    return null;
  }

  return (
    <span className={className}>
      {displayText}
      {displayText && links.length > 0 ? ' ' : null}
      {links.map((href) => (
        <a
          key={href}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="underline whitespace-nowrap"
          onClick={(event) => event.stopPropagation()}
        >
          {t('View on map')}
        </a>
      ))}
    </span>
  );
};

export default LinkifiedText;
