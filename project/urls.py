# -*- coding: UTF-8 -*-

from django.conf.urls.i18n import i18n_patterns
from django.conf.urls import patterns, url, include
from django.conf import settings
from django.core.urlresolvers import reverse
from django.http import HttpResponseRedirect
from django.views.generic.simple import direct_to_template

# Do we have more than one language? If so, localize the URLs and add Django's i18n paths
if len(settings.LANGUAGES) > 1:
    budget_app_urlpatterns = patterns('',
        url(r'^i18n/', include('django.conf.urls.i18n')),
        url(r'^$', lambda x: HttpResponseRedirect(reverse('budget_app_welcome'))),
    )
    url_patterns = i18n_patterns
else:
    budget_app_urlpatterns = patterns('', )
    url_patterns = patterns

# Add the application paths
budget_app_urlpatterns += url_patterns('budget_app.views',
    url(r'^/?$', 'welcome', name="budget_app_welcome"),

    url(r'^resumen$', 'budgets', name="budgets"),

    url(r'^glosario$', 'terms', name="glossary"),

    url(r'^busqueda$', 'search'),

    url(r'^recibo$', 'tax_receipt', name="tax-receipt"),

    # Payments
    url(r'^pagos$', 'payments', name="payments"),
    url(r'^pagos/search$', 'payment_search', name="payment_search"),

    # Policies (top)
    url(r'^politicas$', 'policies', name="policies"),
    url(r'^politicas/(?P<id>[0-9]+)$', 'policies_show', name="policies-show"),
    url(r'^politicas/(?P<id>[0-9]+)/(?P<title>.+)$', 'policies_show', name="policies-show-2"),

    # Programme pages
    url(r'^programas$', 'programmes_show', name="policies-programmes"),
    url(r'^programas/(?P<id>[0-9A-Z]+)$', 'programmes_show', name="policies-programmes-2"),
    url(r'^programas/(?P<id>[0-9A-Z]+)/(?P<title>.+)$', 'programmes_show', name="policies-programmes-3"),

    # Subprogramme pages
    url(r'^subprogramas$', 'subprogrammes_show', name="policies-subprogrammes"),
    url(r'^subprogramas/(?P<id>[0-9A-Z]+)$', 'subprogrammes_show', name="policies-subprogrammes-2"),
    url(r'^subprogramas/(?P<id>[0-9A-Z]+)/(?P<title>.+)$', 'subprogrammes_show', name="policies-subprogrammes-3"),

    # Expense pages (economic breakdown)
    url(r'^articulos/g$', 'expense_articles_show', name="policies-articles"),
    url(r'^articulos/g/(?P<id>[0-9]+)$', 'expense_articles_show', name="policies-articles-2"),
    url(r'^articulos/g/(?P<id>[0-9]+)/(?P<title>.+)$', 'expense_articles_show', name="policies-articles-3"),

    # Income pages
    url(r'^articulos/i$', 'income_articles_show', name="policies-articles"),
    url(r'^articulos/i/(?P<id>[0-9]+)$', 'income_articles_show', name="policies-articles"),
    url(r'^articulos/i/(?P<id>[0-9]+)/(?P<title>.+)$', 'income_articles_show', name="policies-articles"),

    # Secciones
    url(r'^secciones$', 'sections_show', name="sections"),
    url(r'^secciones/(?P<id>[0-9A-Z]+)/(?P<title>.+)$', 'sections_show', name="sections-show"),

    # Counties
    url(r'^comarcas$', 'counties'),
    url(r'^comarcas/(?P<county_slug>[a-z\-]+)$', 'counties_show'),
    url(r'^comarcas/(?P<county_slug>[a-z\-]+)/ingresos/(?P<id>[0-9]+)$', 'counties_show_income'),
    url(r'^comarcas/(?P<county_slug>[a-z\-]+)/gastosf/(?P<id>[0-9]+)$', 'counties_show_functional'),
    url(r'^comarcas/(?P<county_slug>[a-z\-]+)/gastos/(?P<id>[0-9]+)$', 'counties_show_expense'),

    # Towns
    url(r'^municipios$', 'towns'),
    url(r'^municipios/(?P<town_slug>[a-z\-]+)$', 'towns_show'),
    url(r'^municipios/(?P<town_slug>[a-z\-]+)/ingresos/(?P<id>[0-9]+)$', 'towns_show_income'),
    url(r'^municipios/(?P<town_slug>[a-z\-]+)/gastosf/(?P<id>[0-9]+)$', 'towns_show_functional'),
    url(r'^municipios/(?P<town_slug>[a-z\-]+)/gastos/(?P<id>[0-9]+)$', 'towns_show_expense'),

    # Comparison pages
    url(r'^comarcas/(?P<county_left_slug>.+)/(?P<county_right_slug>.+)$', 'counties_compare'),
    url(r'^municipios/(?P<town_left_slug>.+)/(?P<town_right_slug>.+)$', 'towns_compare'),


    #
    # CSV / XLS downloads
    #

    # Policies
    url(r'^politicas/(?P<id>[0-9]+)_functional\.(?P<format>.+)$', 'functional_policy_breakdown'),
    url(r'^politicas/(?P<id>[0-9]+)_economic\.(?P<format>.+)$', 'economic_policy_breakdown'),
    url(r'^politicas/(?P<id>[0-9]+)_funding\.(?P<format>.+)$', 'funding_policy_breakdown'),
    url(r'^politicas/(?P<id>[0-9]+)_institutional\.(?P<format>.+)$', 'institutional_policy_breakdown'),

    # Programmes
    url(r'^programas/(?P<id>[0-9A-Z]+)_functional\.(?P<format>.+)$', 'functional_programme_breakdown'),
    url(r'^programas/(?P<id>[0-9A-Z]+)_economic\.(?P<format>.+)$', 'economic_programme_breakdown'),
    url(r'^programas/(?P<id>[0-9A-Z]+)_funding\.(?P<format>.+)$', 'funding_programme_breakdown'),
    url(r'^programas/(?P<id>[0-9A-Z]+)_institutional\.(?P<format>.+)$', 'institutional_programme_breakdown'),

    # Articles
    url(r'^articulos/(?P<id>[0-9]+)_functional\.(?P<format>.+)$', 'functional_article_expenditures_breakdown'),
    url(r'^articulos/(?P<id>[0-9]+)_economic_revenues\.(?P<format>.+)$', 'economic_article_revenues_breakdown'),
    url(r'^articulos/(?P<id>[0-9]+)_economic_expenditures\.(?P<format>.+)$', 'economic_article_expenditures_breakdown'),
    url(r'^articulos/(?P<id>[0-9]+)_funding_revenues\.(?P<format>.+)$', 'funding_article_revenues_breakdown'),
    url(r'^articulos/(?P<id>[0-9]+)_funding_expenditures\.(?P<format>.+)$', 'funding_article_expenditures_breakdown'),
    url(r'^articulos/(?P<id>[0-9]+)_institutional_revenues\.(?P<format>.+)$', 'institutional_article_revenues_breakdown'),
    url(r'^articulos/(?P<id>[0-9]+)_institutional_expenditures\.(?P<format>.+)$', 'institutional_article_expenditures_breakdown'),

    # Sections
    url(r'^secciones/(?P<id>[0-9A-Z]+)_functional\.(?P<format>.+)$', 'functional_section_breakdown'),
    url(r'^secciones/(?P<id>[0-9A-Z]+)_economic\.(?P<format>.+)$', 'economic_section_breakdown'),

    # Entities lists
    url(r'^gastos_entidades_(?P<level>.+)\.(?P<format>.+)$', 'entities_expenses'),
    url(r'^ingresos_entidades_(?P<level>.+)\.(?P<format>.+)$', 'entities_income'),

    # Entity income/expenses
    url(r'^(?P<level>.+)_(?P<slug>.+)_gastos\.(?P<format>.+)$', 'entity_expenses'),
    url(r'^(?P<level>.+)_(?P<slug>.+)_gastosf\.(?P<format>.+)$', 'entity_functional'),
    url(r'^(?P<level>.+)_(?P<slug>.+)_ingresos\.(?P<format>.+)$', 'entity_income'),

    url(r'^(?P<level>.+)_(?P<slug>.+)_gastosf_(?P<id>[0-9]+)\.(?P<format>.+)$', 'entity_article_functional'),
    url(r'^(?P<level>.+)_(?P<slug>.+)_gastos_(?P<id>[0-9]+)\.(?P<format>.+)$', 'entity_article_expenses'),
    url(r'^(?P<level>.+)_(?P<slug>.+)_ingresos_(?P<id>[0-9]+)\.(?P<format>.+)$', 'entity_article_income'),

    # Payments
    url(r'^(?P<slug>.+)_pagos\.(?P<format>.+)$', 'entity_payments'),
)

# Add extra application paths, not i18n
budget_app_urlpatterns += patterns('budget_app.views',
    # Runtime info
    url(r'^version.json$', 'version_api'),

    # Robots
    # See http://fredericiana.com/2010/06/09/three-ways-to-add-a-robots-txt-to-your-django-project/
    url(r'^robots\.txt$', direct_to_template, {'template': 'robots.txt', 'mimetype': 'text/plain'}),
)

# Include Jasmine urls fot JS Unit Tests only in development
if settings.DEBUG:
    budget_app_urlpatterns += patterns('',
        url(r'^tests/', include('django_jasmine.urls'))
    )

# Add the theme URL patterns, if they exist, in front of the default app ones
if hasattr(settings, 'EXTRA_URLS'):
    urlpatterns = settings.EXTRA_URLS + budget_app_urlpatterns
else:
    urlpatterns = budget_app_urlpatterns
