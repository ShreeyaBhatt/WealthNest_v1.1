"""
api/utils/raw_sql_report.py — Reading the Database with Python's Built-in sqlite3 Module

Everywhere else in this Django app, we let the ORM (PredictionLog.objects...)
talk to the database for us. This script is different on purpose: it
connects to db.sqlite3 directly using Python's built-in `sqlite3`
module, with no Django ORM involved at all, to show what's actually
happening underneath the ORM.

Run it from the django_ai/ folder with:
    python api/utils/raw_sql_report.py

(It only reads data, so it's always safe to run.)
"""

import sqlite3
from pathlib import Path

# This file lives at django_ai/api/utils/raw_sql_report.py, so going up
# two folders (utils -> api -> django_ai) gets us to where db.sqlite3 lives.
DB_PATH = Path(__file__).resolve().parent.parent.parent / 'db.sqlite3'

# Django names the table after the app + model: api_predictionlog
TABLE_NAME = 'api_predictionlog'


def main():
    # connect() opens (or creates) the database file.
    connection = sqlite3.connect(DB_PATH)

    # A cursor is what you use to actually run SQL commands and read results.
    cursor = connection.cursor()

    print('--- How many predictions of each type have been made? ---')
    cursor.execute(f'SELECT prediction_type, COUNT(*) FROM {TABLE_NAME} GROUP BY prediction_type')
    # fetchall() grabs every row the query matched, as a list of tuples.
    for prediction_type, count in cursor.fetchall():
        print(f'{prediction_type}: {count}')

    print('\n--- Most recent prediction ---')
    cursor.execute(f'SELECT prediction_type, result, created_at FROM {TABLE_NAME} ORDER BY created_at DESC LIMIT 1')
    # fetchone() grabs just the next single row (or None if there isn't one).
    latest = cursor.fetchone()
    if latest:
        print(f'type={latest[0]} result={latest[1]} created_at={latest[2]}')
    else:
        print('No predictions logged yet — try calling /api/predict-risk/ or /api/predict-future/ first.')

    # We only ran SELECT queries here, so there's nothing to save — but
    # if this script had run an UPDATE or INSERT, connection.commit()
    # would save those changes (and connection.rollback() would undo
    # them instead, if something went wrong).
    cursor.close()
    connection.close()


if __name__ == '__main__':
    main()
