# -*- coding: UTF-8 -*-
from coffin.shortcuts import render_to_response
from budget_app.models import BudgetBreakdown, Entity, EconomicCategory
from helpers import *

def entities_show(request, c, entity, render_callback=None):
    # Prepare the budget breakdowns
    c['breakdowns'] = {
        'financial_expense': BudgetBreakdown(),
        'functional': BudgetBreakdown(['policy', 'programme']),
        'institutional': get_institutional_breakdown(c) if c['show_global_institutional_treemap'] else None
    }
    if entity.level == settings.MAIN_ENTITY_LEVEL:
        c['breakdowns']['economic'] = BudgetBreakdown(['article', 'heading'])

        # We assume here that all items are properly configured across all dimensions
        # (and why wouldn't they? see below). Note that this is a particular case of the
        # more complex logic below for small entities, and I used for a while the more 
        # general code for all scenarios, until I realised performance was much worse,
        # as we do two expensive denormalize-the-whole-db queries!
        get_budget_breakdown(   "e.id = %s", [ entity.id ],
                                [c['breakdowns']['economic']],
                                get_financial_breakdown_callback(c, \
                                    [c['breakdowns']['functional'], \
                                    c['breakdowns']['institutional']]) )
    else:
        # Small entities have a varying level of detail: often we don't have any breakdown below
        # chapter, so we have to start there. Also, to be honest, the heading level doesn't add
        # much to what you get with articles.
        c['breakdowns']['economic'] = BudgetBreakdown(['chapter', 'article'])

        # For small entities we sometimes have separate functional and economic breakdowns as
        # input, so we can't just get all the items and add them up, as we would double count
        # the amounts.
        get_budget_breakdown(   "e.id = %s and fc.area <> 'X'", [ entity.id ],
                                [],
                                get_financial_breakdown_callback(c, \
                                    [c['breakdowns']['functional'], \
                                    c['breakdowns']['institutional']]) )
        get_budget_breakdown(   "e.id = %s and ec.chapter <> 'X'", [ entity.id ],
                                [ c['breakdowns']['economic'] ] )

    # Additional data needed by the view
    populate_level(c, entity.level)
    populate_entity_stats(c, entity)
    # TODO: We're doing this also for Aragon, check performance!
    populate_entity_descriptions(c, entity)
    populate_years(c, c['breakdowns']['economic'])
    populate_budget_statuses(c, entity.id)
    populate_area_descriptions(c, ['functional', 'income', 'expense', 'institutional'])
    set_full_breakdown(c, entity.level == settings.MAIN_ENTITY_LEVEL)
    c['entity'] = entity

    # if parameter widget defined use policies/widget template instead of policies/show
    template = 'entities/show_widget.html' if isWidget(request) else 'entities/show.html'

    return render(c, render_callback, template)
