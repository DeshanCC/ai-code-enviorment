import axios from 'axios';
import { LANGUAGE_VERSIONS } from '../constants';

const PISTON_API = axios.create({
  baseURL: 'https://emkc.org/api/v2/piston',
  timeout: 20000,
});

export async function executeCode(language, sourceCode) {
  // language must be a key in LANGUAGE_VERSIONS
  const version = LANGUAGE_VERSIONS[language] || null;
  const payload = {
    language,
    version,
    files: [{ content: sourceCode }],
  };

  const resp = await PISTON_API.post('/execute', payload);
  return resp.data;
}
