#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const TIME_ZONE = 'Europe/Bucharest';
const ARCHIVE_PATH = path.join(ROOT, 'briefings', 'chatgpt-arhiva.html');
const INDEX_PATH = path.join(ROOT, 'index.html');
const STATE_PATH = path.join(ROOT, 'briefings', 'chatgpt-state.json');
const PROMPT_PATH = path.join(ROOT, 'prompts', 'chatgpt-business-briefing.md');
const ARCHIVE_START = '<!-- CHATGPT_ARCHIVE_ENTRIES_START -->';
const ARCHIVE_END = '<!-- CHATGPT_ARCHIVE_ENTRIES_END -->';

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

async function readText(filePath, fallback = null) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT' && fallback !== null) return fallback;
    throw error;
  }
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function todayInBucharest() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function romanianLongDate(isoDate) {
  return new Intl.DateTimeFormat('ro-RO', {
    timeZone: TIME_ZONE,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${isoDate}T12:00:00Z`));
}

function daysBetween(fromDate, toDate) {
  const from = Date.parse(`${fromDate}T00:00:00Z`);
  const to = Date.parse(`${toDate}T00:00:00Z`);
  return Math.floor((to - from) / 86_400_000);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll('`', '&#096;');
}

function assertGeneratedHtml(label, html) {
  if (typeof html !== 'string' || html.trim().length < 20) {
    fail(`${label} lipsește sau este prea scurt.`);
  }
  const forbidden = /<\s*(script|style|iframe|object|embed|form|input|button|textarea|select|meta|link)\b|\son[a-z]+\s*=|javascript\s*:/i;
  if (forbidden.test(html)) {
    fail(`${label} conține HTML interzis.`);
  }
}

function extractOutputText(response) {
  if (typeof response?.output_text === 'string' && response.output_text.trim()) {
    return response.output_text;
  }
  const chunks = [];
  for (const item of response?.output ?? []) {
    if (item?.type !== 'message') continue;
    for (const content of item?.content ?? []) {
      if (content?.type === 'output_text' && typeof content.text === 'string') {
        chunks.push(content.text);
      }
    }
  }
  return chunks.join('\n').trim();
}

function parseJsonResponse(raw) {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  try {
    return JSON.parse(cleaned);
  } catch {
    const first = cleaned.indexOf('{');
    const last = cleaned.lastIndexOf('}');
    if (first < 0 || last <= first) fail('Modelul nu a returnat JSON valid.');
    try {
      return JSON.parse(cleaned.slice(first, last + 1));
    } catch (error) {
      fail(`JSON invalid: ${error.message}`);
    }
  }
}

function nextChatGptEdition(indexHtml) {
  const matches = [...indexHtml.matchAll(/ChatGPT\s*[·-]\s*Ediția\s+(\d+)/gi)];
  const numbers = matches.map((match) => Number(match[1])).filter(Number.isFinite);
  return numbers.length ? Math.max(...numbers) + 1 : 1;
}

function buildReportHtml(report) {
  const title = escapeHtml(report.title);
  const description = escapeAttribute(report.teaser);
  const dateLong = romanianLongDate(report.date);
  return `<!DOCTYPE html>
<html lang="ro">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ChatGPT — ${title} — ${dateLong}</title>
<meta name="description" content="${description}">
<meta property="og:title" content="ChatGPT — ${escapeAttribute(report.title)}">
<meta property="og:description" content="${description}">
<meta property="og:type" content="article">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📡</text></svg>">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400..800&family=JetBrains+Mono:wght@400..700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../styles.css">
</head>
<body>
<div class="container container-wide briefing">
  <header class="masthead">
    <p class="kicker">Business Radar · ChatGPT</p>
    <h1><a href="../index.html">Lovitura</a></h1>
    <p class="tagline">Cercetare critică pentru oportunități executabile în România și Europa.</p>
    <p class="edition-date">ChatGPT · Ediția din ${dateLong} · Ediția ${report.edition}</p>
  </header>

  <p class="lede">${report.lede}</p>

  <div class="signal">
    <p class="signal-head">Verdict executiv</p>
    <p><strong>${escapeHtml(report.verdict)}</strong></p>
  </div>

${report.report_body_html.trim()}

  <p class="src"><a href="chatgpt-arhiva.html">Arhiva tuturor ideilor ChatGPT</a> · <a href="../index.html">Toate edițiile Lovitura</a></p>
</div>
</body>
</html>
`;
}

function buildIndexCard(report) {
  const dateLong = romanianLongDate(report.date);
  return `
    <a class="edition-card" href="briefings/chatgpt-${report.date}.html">
      <p class="date">${dateLong} · ChatGPT · Ediția ${report.edition}</p>
      <h2>${escapeHtml(report.title)}</h2>
      <p class="teaser">${escapeHtml(report.teaser)}</p>
    </a>
`;
}

function buildArchiveCard() {
  return `
    <a class="edition-card" href="briefings/chatgpt-arhiva.html">
      <p class="date">Arhivă permanentă · ChatGPT</p>
      <h2>Toate ideile ChatGPT și evoluția verdictelor</h2>
      <p class="teaser">Registrul cumulativ al oportunităților analizate, inclusiv schimbările de lider, ideile retrogradate, criteriile de validare și motivele de abandon.</p>
    </a>
`;
}

function insertAfterEditionsComment(indexHtml, htmlToInsert) {
  const marker = /<!-- EDIȚII:[\s\S]*?-->/;
  if (!marker.test(indexHtml)) fail('Nu am găsit comentariul de inserare a edițiilor în index.html.');
  return indexHtml.replace(marker, (comment) => `${comment}\n${htmlToInsert}`);
}

function updateIndex(indexHtml, report) {
  let updated = indexHtml;
  const reportHref = `briefings/chatgpt-${report.date}.html`;
  const needsArchive = !updated.includes('briefings/chatgpt-arhiva.html');
  const needsReport = !updated.includes(reportHref);
  let insertion = '';
  if (needsReport) insertion += buildIndexCard(report);
  if (needsArchive) insertion += buildArchiveCard();
  if (insertion) updated = insertAfterEditionsComment(updated, insertion);
  return updated;
}

function updateArchive(archiveHtml, report) {
  let updated = archiveHtml;
  const dateLong = romanianLongDate(report.date);

  updated = updated.replace(
    /Actualizată la\s+[^<]+·\s*Arhivă vie/i,
    `Actualizată la ${dateLong} · Arhivă vie`,
  );

  const verdictPattern = /(<p class="signal-head">Verdict curent<\/p>\s*<p>)[\s\S]*?(<\/p>)/i;
  if (verdictPattern.test(updated)) {
    updated = updated.replace(verdictPattern, `$1${report.current_verdict_html}$2`);
  }

  if (!updated.includes(ARCHIVE_START) || !updated.includes(ARCHIVE_END)) {
    const anchor = '<h2 class="section-title">1 · Evoluția liderului</h2>';
    if (!updated.includes(anchor)) fail('Nu am găsit ancora pentru cronologia arhivei.');
    updated = updated.replace(anchor, `${ARCHIVE_START}\n${ARCHIVE_END}\n\n  ${anchor}`);
  }

  const entryId = `chatgpt-${report.date}`;
  if (!updated.includes(`id="${entryId}"`)) {
    const entry = `
  <section id="${entryId}" class="chatgpt-archive-entry">
    <h2 class="section-title">${dateLong} · ChatGPT · Ediția ${report.edition}</h2>
    <p class="section-sub"><a href="chatgpt-${report.date}.html">Deschide raportul complet</a></p>
${report.archive_entry_html.trim()}
  </section>
`;
    updated = updated.replace(ARCHIVE_START, `${ARCHIVE_START}\n${entry}`);
  }

  return updated;
}

async function callOpenAI({ prompt, context }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) fail('Secretul OPENAI_API_KEY nu este disponibil.');

  const model = process.env.OPENAI_MODEL || 'gpt-5.1';
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      instructions: prompt,
      input: context,
      tools: [{
        type: 'web_search',
        search_context_size: 'high',
        user_location: {
          type: 'approximate',
          country: 'RO',
          city: 'Bucharest',
          region: 'București',
          timezone: TIME_ZONE,
        },
      }],
      reasoning: { effort: 'high' },
      max_output_tokens: 30000,
      store: false,
    }),
    signal: AbortSignal.timeout(2_400_000),
  });

  const body = await response.text();
  if (!response.ok) {
    fail(`OpenAI API ${response.status}: ${body.slice(0, 1200)}`);
  }
  const data = JSON.parse(body);
  const output = extractOutputText(data);
  if (!output) fail('OpenAI API nu a returnat text.');
  return parseJsonResponse(output);
}

async function generate(outputPath) {
  const date = todayInBucharest();
  const force = process.env.FORCE_RUN === 'true';
  const state = JSON.parse(await readText(STATE_PATH, '{}'));
  const briefingPath = path.join(ROOT, 'briefings', `chatgpt-${date}.html`);

  if (!force && state.last_published_date && daysBetween(state.last_published_date, date) < 2) {
    await fs.writeFile(outputPath, JSON.stringify({ skip: true, reason: 'interval', date }, null, 2));
    console.log(`SKIP: ultima ediție a fost publicată la ${state.last_published_date}.`);
    return;
  }

  if (await exists(briefingPath)) {
    await fs.writeFile(outputPath, JSON.stringify({ skip: true, reason: 'already-exists', date }, null, 2));
    console.log(`SKIP: briefings/chatgpt-${date}.html există deja.`);
    return;
  }

  const [indexHtml, archiveHtml, prompt] = await Promise.all([
    readText(INDEX_PATH),
    readText(ARCHIVE_PATH),
    readText(PROMPT_PATH),
  ]);
  const edition = nextChatGptEdition(indexHtml);
  const dateLong = romanianLongDate(date);
  const context = `DATA RAPORTULUI: ${dateLong} (${date}), fus orar ${TIME_ZONE}.
EDIȚIE CHATGPT: ${edition}.

CONTEXT CUMULATIV DIN ARHIVA CHATGPT:
${archiveHtml.slice(0, 140000)}

Instrucțiune finală: cercetează web-ul acum, identifică numai delta reală și returnează JSON-ul cerut.`;

  const generated = await callOpenAI({ prompt, context });
  const requiredText = ['title', 'teaser', 'verdict', 'lede', 'report_body_html', 'archive_entry_html', 'current_verdict_html'];
  for (const field of requiredText) {
    if (typeof generated[field] !== 'string' || !generated[field].trim()) fail(`Câmp lipsă: ${field}`);
  }
  assertGeneratedHtml('lede', generated.lede);
  assertGeneratedHtml('report_body_html', generated.report_body_html);
  assertGeneratedHtml('archive_entry_html', generated.archive_entry_html);
  assertGeneratedHtml('current_verdict_html', generated.current_verdict_html);

  const report = {
    skip: false,
    date,
    edition,
    generated_at: new Date().toISOString(),
    model: process.env.OPENAI_MODEL || 'gpt-5.1',
    ...generated,
  };
  await fs.writeFile(outputPath, JSON.stringify(report, null, 2));
  console.log(`Generat: ChatGPT Ediția ${edition} pentru ${date}.`);
}

async function apply(reportPath) {
  const report = JSON.parse(await readText(reportPath));
  if (report.skip) {
    console.log(`Nicio modificare: ${report.reason}.`);
    return;
  }

  const briefingRelative = path.join('briefings', `chatgpt-${report.date}.html`);
  const briefingPath = path.join(ROOT, briefingRelative);
  if (await exists(briefingPath)) {
    console.log(`${briefingRelative} există deja; nu suprascriu ediția imutabilă.`);
    return;
  }

  const [latestIndex, latestArchive] = await Promise.all([
    readText(INDEX_PATH),
    readText(ARCHIVE_PATH),
  ]);

  await fs.writeFile(briefingPath, buildReportHtml(report));
  await fs.writeFile(INDEX_PATH, updateIndex(latestIndex, report));
  await fs.writeFile(ARCHIVE_PATH, updateArchive(latestArchive, report));
  await fs.writeFile(STATE_PATH, JSON.stringify({
    last_published_date: report.date,
    last_edition: report.edition,
    last_title: report.title,
    updated_at: new Date().toISOString(),
  }, null, 2) + '\n');

  console.log(`Aplicat pe ultima versiune main: ${briefingRelative}.`);
}

const [command, argument] = process.argv.slice(2);
if (!command || !argument || !['generate', 'apply'].includes(command)) {
  fail('Utilizare: node scripts/chatgpt-business-briefing.mjs <generate|apply> <report-json-path>');
}

try {
  if (command === 'generate') await generate(argument);
  else await apply(argument);
} catch (error) {
  fail(error?.stack || error?.message || String(error));
}
