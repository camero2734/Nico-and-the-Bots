import {CategoryScale, Chart, Legend, LinearScale, LineController, LineElement, PointElement} from 'chart.js';
import {Canvas, GlobalFonts} from '@napi-rs/canvas';
// import { prisma } from '../src/Helpers/prisma-init';
import { addHours, setHours, startOfDay, differenceInHours } from 'date-fns';
import type { Vote } from '@prisma/client';

GlobalFonts.registerFromPath(`./src/Assets/fonts/f.ttf`, "Futura");
Chart.defaults.font.family = 'Futura';

Chart.register([
  CategoryScale,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Legend
]);

function convertTZ(date: Date, tzString: string) {
    return new Date((typeof date === "string" ? new Date(date) : date).toLocaleString("en-US", {timeZone: tzString}));   
}
function toAmsterdam(date: Date): Date {
    return convertTZ(date, 'Europe/Amsterdam');
}

// Set total number of votes and generate them randomly between chartStart and chartEnd
const totalVotes = 900;
const votes: Vote[] = [];

const now = new Date();
const firstVoteTime = setHours(startOfDay(now), 17);
const chartStart = setHours(startOfDay(toAmsterdam(firstVoteTime)), 17);
const chartEnd = addHours(chartStart, 24);

// Test data for now
for (let i = 0; i < totalVotes; i++) {
  const randomMs = chartStart.getTime() + Math.floor(Math.random() * (chartEnd.getTime() - chartStart.getTime()));
  votes.push({
    id: i,
    pollId: 4,
    userId: `user${i}`,
    createdAt: new Date(randomMs),
    choices: [Math.random() < 0.5 ? 0 : 1],
  } as Vote);
}

// Prepare 24 hourly buckets for each choice
const labels: string[] = [];
const voteCounts0: number[] = [];
const voteCounts1: number[] = [];
for (let i = 0; i < 24; i++) {
  labels.push(i.toString()); 
  voteCounts0.push(0);
  voteCounts1.push(0);
}

// Count votes per hour bucket, split by choice
for (const vote of votes) {
  const voteTime = toAmsterdam(vote.createdAt);
  const diff = differenceInHours(voteTime, chartStart);
  if (diff >= 0 && diff < 24) {
    if (vote.choices[0] === 0) {
      voteCounts0[diff]++;
    } else if (vote.choices[0] === 1) {
      voteCounts1[diff]++;
    }
  }
}

// Optionally, make the Y axis cumulative for each choice
let cumulative0 = 0;
let cumulative1 = 0;
const cumulativeCounts0 = voteCounts0.map(count => cumulative0 += count);
const cumulativeCounts1 = voteCounts1.map(count => cumulative1 += count);

const canvas = new Canvas(1000, 500);
const chart = new Chart(
  canvas as any,
  {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Song 1',
          data: cumulativeCounts0,
          borderColor: 'red',
          fill: false,
          tension: 0.1
        },
        {
          label: 'Song 2',
          data: cumulativeCounts1,
          borderColor: 'blue',
          fill: false,
          tension: 0.1
        }
      ]
    },
    options: {
      scales: {
        x: {
          title: {
            display: true,
            text: 'Hours Elapsed',
          },
        },
        y: {
          title: {
            display: true,
            text: '# of Votes'
          },
          beginAtZero: true
        }
      },
    }
  }
);

const { buffer } = canvas.toBuffer('image/png');
await Bun.write('./test.png', buffer);
chart.destroy();
