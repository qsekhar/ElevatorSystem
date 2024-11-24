document.addEventListener("DOMContentLoaded", () => {
    const elevators = Array.from(document.querySelectorAll('.elevator-space object'));
    const buttons = Array.from(document.querySelectorAll('.buttons button'));
    const waitingTimes = Array.from(document.querySelectorAll('.waiting-time div'));

    const elevatorData = elevators.map(elevator => ({
        element: elevator,
        id: elevator.dataset.elevator,
        position: elevator.dataset.position.split(',').map(Number),
        isMoving: false,
        isLoaded: false
    }));

    const callsQueue = [];

    function updateButton(button, state) {
        if (state === 'waiting') {
            button.style.backgroundColor = 'red';
            button.textContent = 'Waiting';
        } else if (state === 'arrived') {
            button.style.backgroundColor = 'green';
            button.textContent = 'Arrived';
        } else {
            button.style.backgroundColor = '';
            button.textContent = 'Call';
        }
    }

    function updateWaitingTime(floor, time) {
        const waitingTimeDiv = waitingTimes.find(div => div.dataset.waitingTime == floor);
        if (waitingTimeDiv) {
            waitingTimeDiv.textContent = `Waiting time: ${time}s`;

            if (time <= 0) {
                waitingTimeDiv.textContent = '';
            } 
        }
    }

    function playSound() {
        const audio = new Audio('elevator-ding.mp3'); 
        audio.play();
    }

    function setElevatorColor(elevatorElement, color) {
        if (elevatorElement.isLoaded) {
            const svgDoc = elevatorElement.element.contentDocument;
            if (svgDoc) {
                const pathElement = svgDoc.querySelector('path');
                if (pathElement) {
                    pathElement.setAttribute('fill', color);
                }
            }
        }
    }

    function moveElevator(elevator, from, to) {
        elevator.isMoving = true;
        const totalSteps = Math.abs(from - to);
        let currentStep = 0;

        elevator.element.style.transition = `transform ${totalSteps}s linear`;
        elevator.element.style.transform = `translateY(${(from - to) * 50}px)`; 

        return new Promise(resolve => {
            elevator.element.addEventListener('transitionend', function onTransitionEnd() {
                elevator.element.removeEventListener('transitionend', onTransitionEnd);
                elevator.isMoving = false;
                resolve();
            });
        });
    }

    function calculateTotalTime(elevator, targetFloor) {
        const fromFloor = elevator.position[0];
        const travelTime = Math.abs(fromFloor - targetFloor); 
        const additionalTime = 2; 
        return travelTime + additionalTime;
    }

    function handleCall(button, floor) {
        updateButton(button, 'waiting');
        callsQueue.push({ floor, button });
        processCalls();
    }

    async function processCalls() {
        while (callsQueue.length > 0) {
            const { floor: targetFloor, button } = callsQueue.shift();
            const bestElevator = findBestElevator(targetFloor);

            if (bestElevator) {
                const fromFloor = bestElevator.position[0];

                setElevatorColor(bestElevator, '#c20003');
                const totalTime = calculateTotalTime(bestElevator, targetFloor);

                updateWaitingTime(targetFloor, totalTime - 2);
                let timeSpend = 0

                const interval = setInterval(() => {
                    if(totalTime - timeSpend - 2 > 0){
                        timeSpend += 1;
                        updateWaitingTime(targetFloor, totalTime - timeSpend - 2);
                    } else {
                        updateWaitingTime(targetFloor, 0);
                        clearInterval(interval);
                    }
                }, 1000);

                await moveElevator(bestElevator, fromFloor, targetFloor);

                setElevatorColor(bestElevator, '#25b500');
                playSound();
                updateButton(button, 'arrived');

                setTimeout(() => {
                    setElevatorColor(bestElevator, '#000000');
                    updateButton(button, 'call');
                }, 2000); 
            }
        }
    }

    function findBestElevator(floor) {
        const availableElevators = elevatorData.filter(elevator => !elevator.isMoving);
        if (availableElevators.length === 0) return null; 

        return availableElevators.reduce((best, elevator) => {
            const totalTime = calculateTotalTime(elevator, floor);
            if (totalTime < best.totalTime) {
                best.elevator = elevator;
                best.totalTime = totalTime;
            }
            return best;
        }, { elevator: null, totalTime: Infinity }).elevator;
    }

    elevators.forEach((elevator, index) => {
        elevator.addEventListener('load', function() {
            elevatorData[index].isLoaded = true;
            setElevatorColor(elevatorData[index], '#000000');
        });
    });

    buttons.forEach(button => {
        button.addEventListener('click', () => {
            const floor = parseInt(button.dataset.callFrom, 10);
            handleCall(button, floor);
        });
    });
});

