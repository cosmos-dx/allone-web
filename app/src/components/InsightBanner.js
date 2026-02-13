import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Card } from './ui/Card';
import { createSquircleStyle } from '../utils/squircle';
import styles from './styles/insightBanner';

const BAR_COLORS = ['#9333ea', '#3b82f6', '#10b981'];
const H_BAR_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#9333ea', '#7c3aed'];

function GraphBar({ data, colors }) {
  return (
    <View style={styles.barChartRow}>
      {data.map((h, i) => (
        <View key={i} style={styles.barWrap}>
          <View
            style={[
              styles.bar,
              {
                height: h,
                backgroundColor: colors?.[i % colors.length] ?? BAR_COLORS[i % 3],
                opacity: 0.7,
              },
            ]}
          />
        </View>
      ))}
    </View>
  );
}

function GraphHorizontalBar({ data, colors }) {
  const palette = colors ?? H_BAR_COLORS;
  return (
    <View style={styles.horizontalBarChart}>
      {data.map((pct, i) => (
        <View key={i} style={styles.horizontalBarRow}>
          <View style={styles.horizontalBarTrack}>
            <View style={[styles.horizontalBarFill, { width: `${pct}%`, backgroundColor: palette[i % palette.length] }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

function GraphStatsStack({ stats, stack }) {
  return (
    <>
      <View style={styles.statsRow}>
        {stats.map(({ value, label, valueColor }, i) => (
          <View key={i} style={[styles.miniStat, i > 0 && styles.miniStatBorder]}>
            <Text style={[styles.miniStatValue, valueColor && { color: valueColor }]}>{value}</Text>
            <Text style={styles.miniStatLabel}>{label}</Text>
          </View>
        ))}
      </View>
      <View style={styles.stackBarRow}>
        {stack.map(({ flex, color }, i) => (
          <View key={i} style={[styles.stackSegment, { flex: flex || 0.5, backgroundColor: color }]} />
        ))}
      </View>
    </>
  );
}

function GraphLineChart({ data, colors }) {
  const c = colors ?? ['#ea580c', '#f97316'];
  return (
    <View style={styles.lineChartContainer}>
      {data.map((pct, i) => (
        <View
          key={i}
          style={[
            styles.lineChartBar,
            {
              height: `${pct}%`,
              backgroundColor: c[i % 2],
              opacity: 0.85 - i * 0.05,
            },
          ]}
        />
      ))}
    </View>
  );
}

function renderGraph(graphType, graphConfig) {
  switch (graphType) {
    case 'bar':
      return <GraphBar data={graphConfig.data} colors={graphConfig.colors} />;
    case 'horizontalBar':
      return <GraphHorizontalBar data={graphConfig.data} colors={graphConfig.colors} />;
    case 'statsStack':
      return <GraphStatsStack stats={graphConfig.stats} stack={graphConfig.stack} />;
    case 'lineChart':
      return <GraphLineChart data={graphConfig.data} colors={graphConfig.colors} />;
    default:
      return null;
  }
}

export default function InsightBanner({ slides, slideWidth, slideHeight, onPress }) {
  const [page, setPage] = useState(0);
  const onScroll = useCallback(
    (e) => {
      const x = e.nativeEvent.contentOffset.x;
      setPage(Math.min(Math.round(x / slideWidth), slides.length - 1));
    },
    [slideWidth, slides.length]
  );

  return (
    <View>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        onScroll={onScroll}
        scrollEventThrottle={16}
        snapToInterval={slideWidth + 12}
        snapToAlignment="start"
        decelerationRate="fast"
        contentContainerStyle={styles.bannerContent}
        style={styles.bannerScroll}
      >
        {slides.map((slide) => (
          <View key={slide.key} style={{ width: slideWidth, height: slideHeight, paddingRight: 12 }}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => onPress(slide.screen)}
              style={{ flex: 1 }}
            >
              <Card glass style={styles.insightCardBanner} radius="xl">
                <View style={styles.insightCardContent}>
                  <View style={[styles.insightRow, styles.insightRowShrink]}>
                    <View style={[styles.insightIconWrap, { backgroundColor: slide.iconBg }]}>
                      <MaterialCommunityIcons name={slide.icon} size={22} color={slide.iconColor} />
                    </View>
                    <View style={styles.insightText}>
                      <Text style={styles.insightLabel}>{slide.title}</Text>
                      <Text style={styles.insightValue}>{slide.subtitle}</Text>
                    </View>
                    {slide.linkText ? (
                      <View style={styles.insightLink}>
                        <Text style={[styles.insightLinkText, slide.linkColor && { color: slide.linkColor }]}>{slide.linkText}</Text>
                        <MaterialCommunityIcons name="chevron-right" size={18} color={slide.linkColor ?? slide.iconColor} />
                      </View>
                    ) : (
                      <MaterialCommunityIcons name="chevron-right" size={18} color={slide.iconColor} />
                    )}
                  </View>
                  <View style={styles.insightGraphWrap}>
                    {slide.graphType && slide.graphConfig && renderGraph(slide.graphType, slide.graphConfig)}
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
      <View style={styles.paginationDots}>
        {slides.map((_, i) => (
          <View key={i} style={[styles.dot, page === i && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}
