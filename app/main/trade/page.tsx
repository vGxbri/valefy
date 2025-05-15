'use client';

import { CaseOpener } from '@/app/components/case-opener';
import { Case } from '@/app/components/case-opener/types';

// Caso de ejemplo
const TRADE_CASE: Case = {
  id: 'premium-case',
  name: 'PREMIUM CASE',
  price: 2500,
  image: '/cases/premium-case.png',
  description: 'Una caja premium con las mejores skins y una alta probabilidad de obtener objetos raros y legendarios.'
};

export default function Page() {
  return <CaseOpener caseData={TRADE_CASE} />;
}
