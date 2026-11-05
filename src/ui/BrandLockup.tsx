import { brand } from '../shared/brand';
import './brand.css';

/** Decorative mark beside readable text, so the name is announced only once. */
export function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`brand-identity${compact ? ' brand-identity-compact' : ''}`}>
      <img className="brand-symbol" src={brand.mark} width="40" height="40" alt="" />
      <span className="brand-type">
        <strong>{brand.name}</strong>
        {!compact && <small>{brand.descriptor}</small>}
      </span>
    </span>
  );
}
