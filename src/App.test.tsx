import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'
import { createDemoRace } from './data/demoRace'

/** End-to-end flow on the offline demo race: predict, then replay the race. */
describe('App', () => {
  async function addPlayerWithGridPrediction(name: string) {
    const user = userEvent.setup()
    render(<App />)
    await user.type(await screen.findByLabelText('Player name'), name)
    await user.click(screen.getByRole('button', { name: 'Add' }))
    await user.click(screen.getByRole('button', { name: 'Fill top 10 with starting grid' }))
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
    await user.selectOptions(screen.getByLabelText('Drops out'), '1')
    await user.click(screen.getByRole('button', { name: /Race/ }))

    // At the start the grid prediction is perfect: 10 x 3 points.
    expect(screen.getByLabelText('Total points')).toHaveTextContent('30')
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
