'use client'

import axios from "axios";
import { ChainId, TokenAddress } from "../../types";
import getBars, { getAxiosConfig } from "../../utils";
import { BASE_URL } from "../../constants";
import { useEffect, useRef } from "react";
import { ColorType, IChartApi, TimeChartOptions, createChart } from 'lightweight-charts';

interface ChartComponentProps {

}

const ChartComponent: React.FC<ChartComponentProps> = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  let chart: IChartApi | null = null;

  useEffect(() => {
    const fetchDataAndRenderChart = async () => {
      try {
        const result = await getBars(ChainId.ETH, TokenAddress.ETH);

        const chartOptions: TimeChartOptions = {
          layout: {
            textColor: 'black',
            background: { type: ColorType.Solid, color: 'white' },
            fontSize: 12,
            fontFamily: '',
          },
          timeScale: {
            timeVisible: true, // Display time scale
            secondsVisible: true, // Display seconds on the time scale
            borderColor: 'grey', // Color of the time scale border
            visible: true, // Show time scale
            rightOffset: 0,
            barSpacing: 0,
            minBarSpacing: 0,
            fixLeftEdge: false,
            fixRightEdge: false,
            lockVisibleTimeRangeOnResize: false,
            rightBarStaysOnScroll: false,
            borderVisible: false,
            shiftVisibleRangeOnNewBar: false,
            allowShiftVisibleRangeOnWhitespaceReplacement: false,
            ticksVisible: false,
            uniformDistribution: false,
            minimumHeight: 0
          },
          localization: undefined,
          width: 0,
          height: 0,
          autoSize: false,
          watermark: undefined,
          leftPriceScale: undefined,
          rightPriceScale: undefined,
          overlayPriceScales: undefined,
          crosshair: undefined,
          grid: undefined,
          handleScroll: false,
          handleScale: false,
          kineticScroll: undefined,
          trackingMode: undefined
        };

        const container = chartContainerRef.current;
        if (container) {
          chart = createChart(container, chartOptions);
          // Add series and other chart configurations here
          const baselineSeries = chart.addBaselineSeries({ baseValue: { type: 'price', price: 25 }, topLineColor: 'rgba( 38, 166, 154, 1)', topFillColor1: 'rgba( 38, 166, 154, 0.28)', topFillColor2: 'rgba( 38, 166, 154, 0.05)', bottomLineColor: 'rgba( 239, 83, 80, 1)', bottomFillColor1: 'rgba( 239, 83, 80, 0.05)', bottomFillColor2: 'rgba( 239, 83, 80, 0.28)' });
          const { o: openPrices, t: timestamps } = result.getBars;
          const transformedData = openPrices.map((value, index) => ({
            value,
            time: timestamps[index],
          }));
          baselineSeries.setData(transformedData);

          chart.timeScale().fitContent();
        } else {
          console.error('Container element not found');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchDataAndRenderChart();
  }, [])

  return (
    <div id="container" style={{ width: '100%', height: '800px' }} ref={chartContainerRef}></div>
  )
}

export default ChartComponent;