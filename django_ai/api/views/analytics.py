"""
api/views/analytics.py — POST /api/analytics/

Takes portfolio numbers Node already computed (see
server/src/controllers/analytics.controller.js) and turns them into
three different kinds of visualization, each demonstrating a different
library from the syllabus:

1. Seaborn (+matplotlib) → a static bar chart, returned as a base64 PNG
2. Plotly                 → the same data as an interactive chart, sent
                             as JSON for react-plotly.js to render directly
3. NetworkX               → a graph of family members <-> investments,
                             returned as node/edge/degree data
"""

import base64
import io

import matplotlib
matplotlib.use('Agg')  # headless — there's no display/GUI on a server
import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
import networkx as nx
import plotly.graph_objects as go
from rest_framework.decorators import api_view
from rest_framework.response import Response


def build_category_chart_png(category_breakdown):
    """Seaborn bar chart of portfolio value by category, as a base64 PNG
    the React app can drop straight into an <img src="data:image/png;base64,...">.
    """
    if not category_breakdown:
        return None

    df = pd.DataFrame(list(category_breakdown.items()), columns=['category', 'value'])

    sns.set_style('whitegrid')
    fig, ax = plt.subplots(figsize=(6, 4))
    sns.barplot(data=df, x='category', y='value', hue='category', legend=False, palette='crest', ax=ax)
    ax.set_title('Portfolio Value by Category')
    ax.set_xlabel('')
    ax.set_ylabel('Value (INR)')
    plt.xticks(rotation=30, ha='right')
    plt.tight_layout()

    # Instead of saving to a file on disk, we save into an in-memory
    # buffer and base64-encode it — that way the image can travel inside
    # a normal JSON response instead of needing a separate file download.
    buffer = io.BytesIO()
    fig.savefig(buffer, format='png', dpi=100)
    plt.close(fig)  # frees the figure from memory — matplotlib doesn't do this automatically
    buffer.seek(0)
    return base64.b64encode(buffer.read()).decode('utf-8')


def build_category_chart_plotly(category_breakdown):
    """Same data as above, but as an interactive Plotly donut chart."""
    if not category_breakdown:
        return None

    fig = go.Figure(data=[
        go.Pie(labels=list(category_breakdown.keys()), values=list(category_breakdown.values()), hole=0.45)
    ])
    fig.update_layout(title='Portfolio Allocation', margin=dict(t=40, b=10, l=10, r=10))

    # react-plotly.js expects exactly this { data, layout } shape.
    return fig.to_dict()


def build_family_investment_graph(investments):
    """
    A NetworkX graph: one node per family member, one node per
    investment, and an edge from a member to every investment they own.
    "Degree" then tells us, for free, how many investments each member owns.

    Investment nodes are keyed by index+name, not name alone — two
    investments can share a name (e.g. two "PPF" entries), and name-only
    keys would merge them into one node, silently losing an edge's value.
    """
    graph = nx.Graph()

    for i, inv in enumerate(investments):
        owner_name = inv.get('owner') or 'Unknown'
        investment_name = inv.get('name') or 'Investment'
        investment_id = f'investment::{i}::{investment_name}'

        graph.add_node(owner_name, node_type='member', label=owner_name)
        graph.add_node(investment_id, node_type='investment', label=investment_name)
        graph.add_edge(owner_name, investment_id, value=inv.get('currentValue', 0))

    nodes = [
        {
            'id': node_id,
            'type': graph.nodes[node_id]['node_type'],
            'label': graph.nodes[node_id]['label'],
            'degree': degree,
        }
        for node_id, degree in graph.degree()
    ]
    edges = [{'source': u, 'target': v} for u, v in graph.edges()]

    return {'nodes': nodes, 'edges': edges}


@api_view(['POST'])
def analytics(request):
    """
    POST /api/analytics/
    Body: { categoryBreakdown: {category: value, ...}, investments: [{name, category, currentValue, owner}, ...] }
    """
    category_breakdown = request.data.get('categoryBreakdown', {})
    investments = request.data.get('investments', [])

    data = {
        'categoryChartPNG': build_category_chart_png(category_breakdown),
        'categoryChartPlotly': build_category_chart_plotly(category_breakdown),
        'familyGraph': build_family_investment_graph(investments),
    }

    return Response({'success': True, 'message': 'Analytics generated', 'data': data})
