import os
from fastapi import Query
from groq import Groq
from dotenv import load_dotenv
from fastapi import APIRouter
import json
from fastapi import HTTPException
import json
import re

load_dotenv()

# Initialize Groq client
client = Groq(api_key=os.getenv("GROQ_API_KEY"))
router = APIRouter(prefix="/api/v1/medicine", tags=["search"])

STRICT_MEDICAL_PROMPT = """
Return ONLY valid JSON.

Format:

{
  "generic_name": "",
  "drug_class": "",
  "common_dosages": "",
  "requires_prescription": true
}

Rules:
- No extra text
- No markdown
- Be concise
- Use short values
- Max 1 line per field

If invalid query, return:
{"error":"invalid"}
"""




# 3. Logic Function
async def get_medical_data(query: str):
    completion = client.chat.completions.create(
        model="groq/compound",
        max_tokens=400, 
        messages=[
            {"role": "system", "content": STRICT_MEDICAL_PROMPT},
            {"role": "user", "content": f"Extract data for: {query}"}
        ],
        extra_body={
            "compound_custom": {
                "tools": {
                    "web_search": {
                        "max_results": 1,
                        "allowed_domains": ["drugs.com"]
                    }
                }
            }
        }

    )

    return completion.choices[0].message.content


def extract_json(text: str):
    """
    Extract first JSON object from text
    """
    match = re.search(r"\{.*\}", text, re.DOTALL)

    if not match:
        return None

    return match.group()


@router.get("/search")
async def search(q: str = Query(..., min_length=2)):
    q = q.strip()[:50]   # Max 50 chars
    try:
        raw = await get_medical_data(q)
        print("RAW AI RESPONSE:\n", raw)
        # Try direct parse
        try:
            return json.loads(raw)

        except json.JSONDecodeError:
            # Try extracting JSON from text
            extracted = extract_json(raw)

            if not extracted:
                raise ValueError("No JSON found")

            return json.loads(extracted)

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse medical data: {str(e)}"
        )
