import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'
import { createDemoRace } from './data/demoRace'
import { snapshotAt } from './domain/snapshot'

/** End-to-end flow on the offline demo race: predict, then replay the race. */
describe('App', () => {
  async function addPlayerWithGridPrediction(name: string) {
    const user = userEvent.setup()
    render(<App />)
    await user.type(await screen.findByLabelText('Player name'), name)
    await user.click(screen.getByRole('button', { name: 'Add' }))
    await user.click(screen.getByRole('button', { name: /Fill top \d+ with starting grid/ }))
    return user
  }

  it('starts on the demo race with an empty player list', async () => {
    render(<App />)
    expect(await screen.findByText(/Add yourself/)).toBeInTheDocument()
    expect(screen.getByLabelText('Season')).toHaveValue('demo')
  })

  it('lets a player fill in a prediction and remembers it', async () => {
    await addPlayerWithGridPrediction('Alex')
    expect(screen.getByText("Alex's prediction")).toBeInTheDocument()
    expect(screen.getByLabelText('P1')).not.toHaveValue('')

    // Reloading the app keeps the prediction (stored in the browser).
    const p1 = (screen.getByLabelText('P1') as HTMLSelectElement).value
    render(<App />)
    expect(screen.getAllByLabelText('P1').at(-1)).toHaveValue(p1)
  })

  it('does not allow the same driver twice in the top 10', async () => {
    await addPlayerWithGridPrediction('Alex')
    const p1Driver = (screen.getByLabelText('P1') as HTMLSelectElement).value
    const option = within(screen.getByLabelText('P2')).getByRole('option', { name: new RegExp(`^${codeOf(p1Driver)} `) })
    expect(option).toBeDisabled()
  })

  it('shows the live score and explains changes during the replay', async () => {
    const user = await addPlayerWithGridPrediction('Alex')
    await user.selectOptions(screen.getByLabelText('Dropout'), '1')
    await user.click(screen.getByRole('button', { name: /Race/ }))

    // At the start the grid prediction is perfect: 15+12+10+8+7+5x5 = 77 points = 19 beers.
    expect(screen.getByLabelText('Total points')).toHaveTextContent('77')
    expect(screen.getByText(/19 beers/)).toBeInTheDocument()
    expect(screen.getByText('Lap 1 / 30')).toBeInTheDocument()
    expect(screen.getByText(/Nothing yet/)).toBeInTheDocument()

    // Jump to the end of the race.
    const race = createDemoRace()
    fireEvent.change(screen.getByLabelText('Race position'), { target: { value: race.endMs } })
    expect(screen.getByText('Finished')).toBeInTheDocument()
    expect(screen.queryByText(/Nothing yet/)).not.toBeInTheDocument()
    expect(screen.getAllByText(/Lap \d+/).length).toBeGreaterThan(1)
    expect(screen.getAllByText('OUT')).toHaveLength(2)
  })

  it('only offers drivers starting P11 or lower as joker', async () => {
    await addPlayerWithGridPrediction('Alex')
    const race = createDemoRace()
    const grid = snapshotAt(race, race.startMs).grid
    const options = within(screen.getByLabelText('Joker'))
      .getAllByRole('option')
      .map((o) => (o as HTMLOptionElement).value)
      .filter(Boolean)
    expect(options.map(Number).sort()).toEqual(grid.slice(10).sort())
  })

  it('supports sprints: only a top 3 to predict', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.selectOptions(screen.getByLabelText('Race'), 'demo-sprint')
    await user.type(await screen.findByLabelText('Player name'), 'Sam')
    await user.click(screen.getByRole('button', { name: 'Add' }))
    await user.click(screen.getByRole('button', { name: 'Fill top 3 with starting grid' }))
    expect(screen.getByText('Sprint top 3')).toBeInTheDocument()
    expect(screen.queryByLabelText('P4')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Joker')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Race/ }))
    // 8 + 7 + 5
    expect(screen.getByLabelText('Total points')).toHaveTextContent('20')
  })

  it('has play/pause and replay speed controls', async () => {
    const user = await addPlayerWithGridPrediction('Alex')
    await user.click(screen.getByRole('button', { name: /Race/ }))
    expect(screen.getByLabelText('Replay duration')).toHaveValue(String(3 * 60_000))
    await user.click(screen.getByRole('button', { name: 'Play' }))
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument()
  })
})

function codeOf(driverNumber: string) {
  return createDemoRace().drivers.find((d) => String(d.number) === driverNumber)!.code
}
