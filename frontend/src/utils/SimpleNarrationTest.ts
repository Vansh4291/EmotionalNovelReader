import Tts from 'react-native-tts';

let testCount = 0;

export async function testTtsBasic(): Promise<string> {
  try {
    await Tts.getInitStatus();
    testCount++;
    await Tts.speak(`Test ${testCount}: The narration system is working.`);
    return `OK: speak() executed for test ${testCount}`;
  } catch (e) {
    return `FAIL: ${e instanceof Error ? e.message : String(e)}`;
  }
}

export async function testTtsFull(): Promise<string> {
  const results: string[] = [];
  try {
    const status = await Tts.getInitStatus();
    results.push(`Init status: ${JSON.stringify(status)}`);
  } catch (e) {
    results.push(`Init status error: ${e}`);
  }

  try {
    await Tts.setDefaultLanguage('en-US');
    await Tts.setDefaultRate(1.0);
    await Tts.setDefaultPitch(1.0);
    results.push('Defaults set OK');
  } catch (e) {
    results.push(`Defaults error: ${e}`);
  }

  try {
    testCount++;
    await Tts.speak(`Test ${testCount}. This is a narration test.`);
    results.push(`Speak OK (test ${testCount})`);
  } catch (e) {
    results.push(`Speak error: ${e}`);
  }

  return results.join(' | ');
}

export function getTestCount(): number {
  return testCount;
}

export default { testTtsBasic, testTtsFull, getTestCount };
