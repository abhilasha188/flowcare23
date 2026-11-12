# FlowCare reviewed knowledge sources

Place only reviewed, public educational material in this directory. Do not add user records, private documents, or content whose use is not authorized. The ingestion command processes source `.md` files (not this `README.md`) and PDFs in this directory only; it never downloads sources or fabricates citations.

Markdown files require frontmatter:

```markdown
---
title: Periods
sourceName: NHS
sourceUrl: https://www.nhs.uk/conditions/periods/
category: Menstrual cycle basics
---

Locally stored and reviewed educational content goes here.
```

For each PDF, add a same-name metadata sidecar, for example `guide.pdf.json`:

```json
{
  "title": "Document title",
  "sourceName": "Publishing organization",
  "sourceUrl": "https://publisher.example/official-document-page",
  "category": "Menstrual cycle basics"
}
```

Verify the organization, document, URL, and redistribution permissions before ingestion. Each document is embedded sequentially; ingestion reports the actual embedding dimension needed to configure Atlas Vector Search.

## Seeded reviewed notes

The Markdown notes in this folder are concise paraphrases of NHS patient-information pages already linked by FlowCare. They retain source URLs in frontmatter, avoid diagnosis or treatment advice, and flag the NHS periods page's review date because its next review date had passed when checked. Re-check sources before a production release; add only material that has been reviewed and is authorized for use.
