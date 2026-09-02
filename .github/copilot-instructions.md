# Purpose and Scope

This instruction set provides a guide on how to effectively leverage Dynatrace, our observability platform, do assist developers, SREs, and DevOps engineers in identifying and fixing performance issues and problems.

# Requirements
The following should be done EVERY TIME you do anything. These are non-negotiable.

- placeholder

# Tips
- If you don't know what field has the data you're looking for, use the ```search``` command (e.g. ```fetch events | search "keyword" | limit 10```).
- If your queries repeatedly come back with no data, ask for more details or guidance. Do not make unnecessary assumptions.
- Logs are associated with infrastructure entities such as pods, workloads, hosts, process groups, etc. Do not use the dt.entity.service ID as a filter for logs.

# Output
Output should always be structured as follows:
1. Answer - The actual structure of your answer is up to you and any input given by the user.
2. Appendix - Always include an appendix including any queries you use that return data. Include the query and a summary of what it does and what it contributed to your research.

# Pre-Submit Checklist
Before completing any task, verify:

 - All requirements followed
 - Required output format met
 - Security requirements satisfied
 - Context fully gathered
 - Edge cases considered
 - Tests run (if applicable)
 - Documentation updated

## Quick Use Case Overview

These are the types of use-cases you can assist with.

### Business Observability
This data is great for getting actual business-grade data and understanding performance of the business.

This query is great for gathering all types of business events and seeing a count for each. Use this to get a list of business events and see which ones occur the most.

```
//Fetch business events in the last hour. Summarize the results as the total count of events split by event type. Sort the results by count and limit it to the top 10.**
fetch bizevents, from:now()-1h
| summarize event_count = count(), by:{event.type}
| sort event_count desc
| limit 10
```

This query is a bit more specific for astroshop. It is good for summarizing performance. Adjust the timeframe as needed (e.g. `from:now()-1w` checks the last week)

```
//Fetch business events in the last hour. Summarize the results by total, checkout count, cart view count, product view count, and home view count. Add two additional fields calculating the conversion rate and cart to checkout rate.**
fetch bizevents, from:now()-1h
| summarize
    total_events = count(),
    checkout_count = countIf(event.type == "astroshop.web.checkout_success"),
    cart_views = countIf(event.type == "astroshop.web.cart"),
    product_views = countIf(event.type == "astroshop.web.products"),
    home_views = countIf(event.type == "astroshop.web.home")
| fieldsAdd
    conversion_rate = (checkout_count * 100.0) / home_views,
    cart_to_checkout = (checkout_count * 100.0) / cart_views
```

### Enhancing/Optimizing DQL Filter Queries
If you receive a prompt to query for code owned by a specific team or individual, you can use the following DQL (Data Query Language) references to help construct your query.

For Peter Parker's services that he owns, you can use the following DQL query:
```
//Fetch service entities and filter by the services that contain the tag astroshop.org/owner:Team-Financial-Services.**
fetch dt.entity.service
| expand tags, alias:tag
| filter contains(tag, "astroshop.org/owner:Team-Financial-Services")
```

### Finding Problems
When asked about finding problems or issues with an entity, use the following filter. Replace `<entity-id>` with the actual entity ID. Use this with the list_problems tool.

```
in(affected_entity_ids, "<entity-id>") OR matchesValue(affected_entity_ids, "<entity-id>")
```