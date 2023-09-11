import json
import os
import openai
from pydantic import BaseModel
from mealie.core.config import get_app_settings


class OpenAiIngredient(BaseModel):
    ingredient: str = ""
    unit: str = ""
    amount: float = 1.0
    note: str = ""
    original_text: str | None


instruction = """Given this a list of ingredients. Create a new list that contains five parts:
Ingredient: The type ingredient.
Unit: The unit of measurement (might be empty).
Amount: The amount of the unit of measurement. If no amount is provided, use 0. If the amount is a range between two numbers, take the mean.
Note: Any extra information provided (might be empty).
ID: The ID of the list item"""

schema = {
    "type": "object",
    "properties": {
        "ingredients": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "ingredient": {
                        "type": "string",
                        "description": "The type ingredient. Will always be in singular form.",
                    },
                    "unit": {
                        "type": "string",
                        "description": "The unit of measurement. Will always be in full form, and not abbreviated.",
                    },
                    "amount": {
                        "type": "number",
                        "minimum": 0,
                    },
                    "note": {"type": "string"},
                    "id": {"type": "number"},
                },
            },
        },
    },
}


def parse_ingredients(ingredients_list: list[str]) -> list[OpenAiIngredient]:
    settings = get_app_settings()

    if not settings.OPENAI_API_KEY:
        raise Exception("OpenAI API Key was not set")
    openai.api_key = settings.OPENAI_API_KEY

    ingredients_with_index = [f"{i}: {ingredient}" for i, ingredient in enumerate(ingredients_list)]

    response = openai.ChatCompletion.create(
        model=settings.OPENAI_MODEL,
        messages=[
            {"role": "system", "content": instruction},
            {"role": "user", "content": "The ingredients list:\n" + "\n".join(ingredients_with_index)},
            {
                "role": "user",
                "content": "Units should not be abbreviated. If a unit is abbreviated, convert it into its full form in the language of the list. Example: kg -> kilogram",
            },
            {
                "role": "function",
                "name": "set_ingredients",
                "content": "Make both ingredients and unit into singular form in the language of the list.",
            },
        ],
        functions=[{"name": "set_ingredients", "parameters": schema}],
        temperature=0.1,
    )

    message = response["choices"][0]["message"]
    raw_data = message["function_call"]["arguments"] if "function_call" in message else message["content"]

    data = json.loads(raw_data)

    parsed_ingredients = [
        OpenAiIngredient(
            ingredient=ingredient["ingredient"],
            unit=ingredient["unit"],
            amount=ingredient["amount"],
            note=ingredient["note"],
            original_text=ingredients_list[ingredient["id"]] if len(ingredients_list) > ingredient["id"] else None,
        )
        for ingredient in data["ingredients"]
    ]

    return parsed_ingredients
