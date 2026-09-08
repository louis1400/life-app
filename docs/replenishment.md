# Replenishment model

Each purchased unit is the complete pack sold at its saved AH URL. One Powerade pack means twelve bottles; one Tempo pack means ten pocket packs. Stock is measured in unopened sale packs and remains nullable until observed.

Events are persisted per authenticated user and product. The append statement checks the last product event sequence in the same SQL statement, so a stale concurrent action cannot be applied twice. An update's UUID is an idempotency key. Undo appends a reversal of the latest effective action; historical events remain auditable.

For products consumed over time, only a fresh-pack opening followed by a finish yields a measurement. Already-open partial packs and zero-day intervals do not count. The latest five complete observations produce a median number of days per pack. The first two observations are explicitly tentative.

For one-use soup packets, usage cadence is elapsed time between the first and last of the most recent eight usage events, divided by the number of intervals. Multiple packets consumed on the same day count toward that rate once there is a positive observation span.

Refill dates require both observed usage and known spare stock. Cycle products also need the opening date of the current pack; otherwise the date stays unknown. Future stock changes, missed logs, holidays, and varying habits can make predictions inaccurate. All dates are estimates and never submit an order.

There is no scheduled order job in this version. Tracking is the first product slice; authenticated AH checkout and a reliable server-side ordering worker are separate work.
