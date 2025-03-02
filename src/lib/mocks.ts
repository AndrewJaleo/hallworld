interface GroupMessage {
  id: string;
  content: string;
  sender_id: string;
  sender_email: string;
  created_at: string;
}

interface MockMessages {
  [key: string]: GroupMessage[];
}

interface GroupChat {
  id: string;
  name: string;
  category: string;
  city: string;
  type: string;
}

interface MockGroupChats {
  [key: string]: GroupChat;
}

export const mockGroupChats: MockGroupChats = {
  "group-1": {
    id: "group-1",
    name: "HALL University - Madrid",
    category: "University",
    city: "Madrid",
    type: "hall"
  },
  "group-2": {
    id: "group-2",
    name: "HALL Art - Madrid",
    category: "Art",
    city: "Madrid",
    type: "hall"
  },
  "group-3": {
    id: "group-3",
    name: "HALL Plans - Madrid",
    category: "Plans",
    city: "Madrid",
    type: "hall"
  },
  "group-4": {
    id: "group-4",
    name: "HALL Sports - Madrid",
    category: "Sports",
    city: "Madrid",
    type: "hall"
  },
  "politica": {
    id: "politica",
    name: "Política - Madrid",
    category: "Política",
    city: "Madrid",
    type: "topic"
  },
  "ligar": {
    id: "ligar",
    name: "Ligar - Madrid",
    category: "Ligar",
    city: "Madrid",
    type: "topic"
  },
  "universidad": {
    id: "universidad",
    name: "Universidad - Madrid",
    category: "Universidad",
    city: "Madrid",
    type: "topic"
  },
  "planes": {
    id: "planes",
    name: "Planes - Madrid",
    category: "Planes",
    city: "Madrid",
    type: "topic"
  },
  "cerca": {
    id: "cerca",
    name: "Cerca de mí - Madrid",
    category: "Cerca",
    city: "Madrid",
    type: "topic"
  },
  "amistad": {
    id: "amistad",
    name: "Amistad - Madrid",
    category: "Amistad",
    city: "Madrid",
    type: "topic"
  },
  "arte": {
    id: "arte",
    name: "Arte - Madrid",
    category: "Arte",
    city: "Madrid",
    type: "topic"
  },
  "ciudad": {
    id: "ciudad",
    name: "Ciudad - Madrid",
    category: "Ciudad",
    city: "Madrid",
    type: "topic"
  }
};

export const mockMessages: MockMessages = {
  "group-1": [
    {
      id: "msg1",
      content: "Hey everyone! Anyone up for study group?",
      sender_id: "user1",
      sender_email: "alice@example.com",
      created_at: "2024-03-15T10:00:00Z"
    },
    {
      id: "msg2",
      content: "I'm in! Library in 30?",
      sender_id: "user2",
      sender_email: "bob@example.com",
      created_at: "2024-03-15T10:05:00Z"
    }
  ],
  "group-2": [
    {
      id: "msg3",
      content: "New exhibition at the modern art museum!",
      sender_id: "user3",
      sender_email: "charlie@example.com",
      created_at: "2024-03-15T11:00:00Z"
    }
  ],
  "politica": [
    {
      id: "pol1",
      content: "¿Alguien va a la manifestación del sábado?",
      sender_id: "user3",
      sender_email: "charlie@example.com",
      created_at: "2024-03-16T09:30:00Z"
    },
    {
      id: "pol2",
      content: "Yo iré. ¿Quedamos en Sol a las 11?",
      sender_id: "user1",
      sender_email: "alice@example.com",
      created_at: "2024-03-16T09:45:00Z"
    }
  ],
  "ligar": [
    {
      id: "lig1",
      content: "¿Alguien para salir este finde?",
      sender_id: "user2",
      sender_email: "bob@example.com",
      created_at: "2024-03-16T18:20:00Z"
    }
  ],
  "universidad": [
    {
      id: "uni1",
      content: "¿Alguien tiene los apuntes de Economía?",
      sender_id: "user1",
      sender_email: "alice@example.com",
      created_at: "2024-03-17T14:10:00Z"
    },
    {
      id: "uni2",
      content: "Yo los tengo, te los paso por privado",
      sender_id: "user3",
      sender_email: "charlie@example.com",
      created_at: "2024-03-17T14:15:00Z"
    }
  ],
  "planes": [
    {
      id: "pla1",
      content: "¿Alguien se apunta al concierto del viernes?",
      sender_id: "user2",
      sender_email: "bob@example.com",
      created_at: "2024-03-18T12:05:00Z"
    }
  ],
  "cerca": [
    {
      id: "cer1",
      content: "¿Alguien conoce un buen restaurante por Malasaña?",
      sender_id: "user3",
      sender_email: "charlie@example.com",
      created_at: "2024-03-19T19:30:00Z"
    }
  ],
  "amistad": [
    {
      id: "ami1",
      content: "¡Hola a todos! Soy nuevo en Madrid, ¿alguien para quedar?",
      sender_id: "user1",
      sender_email: "alice@example.com",
      created_at: "2024-03-20T10:45:00Z"
    },
    {
      id: "ami2",
      content: "¡Bienvenido! Tenemos un grupo que queda los jueves",
      sender_id: "user2",
      sender_email: "bob@example.com",
      created_at: "2024-03-20T11:00:00Z"
    }
  ],
  "arte": [
    {
      id: "art1",
      content: "¿Alguien ha visto la exposición del Reina Sofía?",
      sender_id: "user3",
      sender_email: "charlie@example.com",
      created_at: "2024-03-21T16:20:00Z"
    }
  ],
  "ciudad": [
    {
      id: "ciu1",
      content: "¿Qué zonas recomendáis para vivir en Madrid?",
      sender_id: "user1",
      sender_email: "alice@example.com",
      created_at: "2024-03-22T08:15:00Z"
    },
    {
      id: "ciu2",
      content: "Malasaña y Chamberí son muy buenas opciones",
      sender_id: "user2",
      sender_email: "bob@example.com",
      created_at: "2024-03-22T08:30:00Z"
    }
  ]
}; 