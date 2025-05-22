export function randomIntFromInterval(min: number, max: number) {
  // min included and max excluded
  return Math.random() * (max - min) + min;
}

export function numberName(n: number) {
  if (n == 0) {
    return 'zero';
  }

  let numberName: string[] = [];
  let d43 = Math.floor(n / 1000);
  if (d43 != 0) {
    numberName.push(names100[d43]);
    numberName.push('thousand');
    n -= d43 * 1000;
  }

  let d2 = Math.floor(n / 100);
  if (d2 != 0) {
    numberName.push(names100[d2]);
    numberName.push('hundred');
    n -= d2 * 100;
  }

  let d10 = n;
  if (d10 != 0) {
    numberName.push(names100[d10]);
  }

  return numberName.join(' ');
}

export function assertAlways(condition: boolean) {
  if (!condition) {
    throw Error('Assertion failed');
  }
}

const digits = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const names100: string[] = [
  ...digits,
  ...['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'],
  ...digits.map((digit) => `twenty${digit != '' ? '-' + digit : ''}`),
  ...digits.map((digit) => `thirty${digit != '' ? '-' + digit : ''}`),
  ...digits.map((digit) => `forty${digit != '' ? '-' + digit : ''}`),
  ...digits.map((digit) => `fifty${digit != '' ? '-' + digit : ''}`),
  ...digits.map((digit) => `sixty${digit != '' ? '-' + digit : ''}`),
  ...digits.map((digit) => `seventy${digit != '' ? '-' + digit : ''}`),
  ...digits.map((digit) => `eighty${digit != '' ? '-' + digit : ''}`),
  ...digits.map((digit) => `ninety${digit != '' ? '-' + digit : ''}`)
];
