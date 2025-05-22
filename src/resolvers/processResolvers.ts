const processStates = {
  audio: { step: 'Idle', done: false },
  plate: { step: 'Idle', done: false },
  reco: { step: 'Idle', done: false },
}

const resolvers = {
  Query: {
    processStatuses: (_: any, { userId }: { userId: string }) => {
      // For MVP, return mocked states
      return [
        { process: 'audio', ...processStates.audio },
        { process: 'plate', ...processStates.plate },
        { process: 'reco', ...processStates.reco },
      ]
    }
  }
}