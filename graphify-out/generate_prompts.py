import json
from pathlib import Path

chunks = json.loads(Path('graphify-out/.graphify_chunks.json').read_text(encoding='utf-8'))
project_root = Path('graphify-out/.graphify_root').read_text(encoding='utf-8').strip()

subagents_prompts = []
for i, chunk in enumerate(chunks):
    chunk_num = i + 1
    total_chunks = len(chunks)
    file_list = '\n'.join(chunk)
    chunk_path = f'{project_root}/graphify-out/.graphify_chunk_{chunk_num:02d}.json'
    
    prompt = f"""You are a graphify extraction subagent.
Instructions:
1. Read the detailed extraction specifications and output JSON schema from:
   /Users/ziadhosaaam/.gemini/config/skills/graphify/references/extraction-spec.md
2. Read the files listed below.
3. Perform semantic entity and relationship extraction on these files using the rules in the specifications.
4. Save the resulting JSON directly to:
   {chunk_path}
   using your file writing tool. Set Overwrite to true.
5. Report back when done.

Files to process (chunk {chunk_num} of {total_chunks}):
{file_list}"""
    
    subagents_prompts.append({
        'TypeName': 'self',
        'Role': f'Semantic Extractor Chunk {chunk_num}',
        'Prompt': prompt
    })

Path('graphify-out/.subagents_prompts_simple.json').write_text(json.dumps(subagents_prompts, indent=2, ensure_ascii=False), encoding='utf-8')
print(f'Generated {len(subagents_prompts)} simple subagent prompts.')
