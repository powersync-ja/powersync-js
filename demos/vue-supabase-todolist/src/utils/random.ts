export const generateRandomFirstName = () => {
    const firstNames = [
        'Aiden', 'Aria', 'Avery', 'Blake', 'Brooklyn', 'Cameron', 'Charlie', 'Dakota',
        'Dallas', 'Eden', 'Elliot', 'Emerson', 'Finley', 'Harper', 'Hayden', 'Jordan',
        'Kai', 'Karter', 'Kennedy', 'Lennox', 'Logan', 'London', 'Mackenzie', 'Marley',
        'Morgan', 'Parker', 'Payton', 'Phoenix', 'Quinn', 'Reese', 'Riley', 'River',
        'Rowan', 'Ryan', 'Sawyer', 'Skylar', 'Taylor', 'Teagan', 'Tyler', 'Zion'
    ];

    // Generate random index for first names
    const firstNameIndex = Math.floor(Math.random() * firstNames.length);

    // Return the first name
    return firstNames[firstNameIndex] + "-" + Math.round(Math.random() * 100);
}