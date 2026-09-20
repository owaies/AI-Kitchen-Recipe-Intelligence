create unique index if not exists meal_plans_user_date_meal_unique
on meal_plans(user_id, plan_date, meal_type);
