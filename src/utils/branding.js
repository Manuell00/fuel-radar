const BRANDS = {
  'ENI':           { bg: '#FFD000', fg: '#000', short: 'EN' },
  'Q8':            { bg: '#E30613', fg: '#fff', short: 'Q8' },
  'IP':            { bg: '#005EB8', fg: '#fff', short: 'IP' },
  'Shell':         { bg: '#DD1D21', fg: '#fff', short: 'SH' },
  'Esso':          { bg: '#E30613', fg: '#fff', short: 'ES' },
  'Tamoil':        { bg: '#F7A600', fg: '#000', short: 'TM' },
  'API':           { bg: '#0061A0', fg: '#fff', short: 'AP' },
  'TotalEnergies': { bg: '#E8323C', fg: '#fff', short: 'TO' },
  'Gulf':          { bg: '#F47920', fg: '#fff', short: 'GU' },
  'ERG':           { bg: '#E30613', fg: '#fff', short: 'ER' },
  'Repsol':        { bg: '#FFD700', fg: '#000', short: 'RE' },
  'Calpam':        { bg: '#1A4E8C', fg: '#fff', short: 'CA' },
  'Kerotris':      { bg: '#4B9E3F', fg: '#fff', short: 'KE' },
  'Indipendente':  { bg: '#64748b', fg: '#fff', short: 'IN' },
}

const DEFAULT = { bg: '#94a3b8', fg: '#fff', short: '⛽' }

export function getBrandMeta(brand) {
  return BRANDS[brand] || DEFAULT
}
